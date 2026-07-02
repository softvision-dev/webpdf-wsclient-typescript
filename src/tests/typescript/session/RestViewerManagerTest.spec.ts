import {expect} from "chai";
import {it, suite} from "mocha";
import {models, RestViewerManager} from "../../../main/typescript";

/**
 * Captured shape of the last HTTP request the manager issued through the stub session.
 */
interface CapturedRequest {
	method?: string;
	url?: string;
}

/**
 * Builds a stub RestSession sufficient for {@link RestViewerManager}: it resolves URLs the same way
 * {@link AbstractSession#getURL} does, supplies a no-op bearer auth provider and routes HTTP requests
 * through the supplied response factory while capturing the request config for assertions.
 */
function createStubSession(
	captured: CapturedRequest,
	responseFactory: (config: any) => any
): any {
	return {
		getURL: (subPath: string, parameters?: URLSearchParams): URL => {
			let url: URL = new URL("http://localhost/webPDF/rest/" + subPath);
			if (typeof parameters !== "undefined") {
				parameters.forEach((value: string, key: string): void => url.searchParams.append(key, value));
			}
			return url;
		},
		getAuthProvider: (): any => ({
			provide: async (): Promise<any> => ({
				getAuthHeader: (): any => ({Authorization: "Bearer TEST"})
			})
		}),
		getHttpClient: (): any => ({
			request: async (config: any): Promise<any> => {
				captured.method = config.method;
				captured.url = config.url;
				return {status: 200, headers: {"content-type": "application/json"}, data: responseFactory(config)};
			}
		})
	};
}

suite("RestViewerManagerTest", function (): void {
	it("fetchProfile GETs the public tenant profile endpoint and hydrates the branding view",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let session: any = createStubSession(captured, (): any => ({
				id: "acme",
				branding: {logoUrl: "assets/logo.png", customCssUrl: "assets/brand.css", theme: {highlight: {primary: "#123456"}}},
				viewerOptions: {zoomMode: "FIT_PAGE"},
				userOptions: {language: "de"}
			}));
			let manager: RestViewerManager = new RestViewerManager(session);

			let profile: models.ViewerProfilePublicView = await manager.fetchProfile("acme");

			expect(captured.method).to.equal("GET");
			expect(captured.url).to.equal("http://localhost/webPDF/rest/viewer/acme/profile");
			expect(profile).to.be.instanceOf(models.ViewerProfilePublicView);
			expect(profile.branding).to.be.instanceOf(models.PublicBranding);
			expect(profile.branding?.logoUrl).to.equal("assets/logo.png");
			expect(profile.viewerOptions?.zoomMode).to.equal("FIT_PAGE");
		});

	it("fetchProfile URL-encodes the tenant id",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let session: any = createStubSession(captured, (): any => ({id: "a b/c"}));
			let manager: RestViewerManager = new RestViewerManager(session);

			await manager.fetchProfile("a b/c");

			expect(captured.url).to.equal("http://localhost/webPDF/rest/viewer/a%20b%2Fc/profile");
		});

	it("validateExternalDocument base64url-encodes the target URL and hydrates the result",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let externalUrl: string = "https://cdn.example.com/report.pdf?token=a+b/c=";
			let session: any = createStubSession(captured, (): any => ({url: externalUrl}));
			let manager: RestViewerManager = new RestViewerManager(session);

			let result: models.ViewerExternalDocument = await manager.validateExternalDocument("acme", externalUrl);

			expect(captured.method).to.equal("GET");
			let requestUrl: URL = new URL(captured.url as string);
			expect(requestUrl.pathname).to.equal("/webPDF/rest/viewer/acme/external");

			// The target must be base64url (URL-safe alphabet, no padding) and decode back to the original URL.
			let target: string = requestUrl.searchParams.get("target") as string;
			expect(target).to.not.match(/[+/=]/, "target must use the URL-safe base64 alphabet without padding");
			let decoded: string = Buffer.from(target.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
			expect(decoded).to.equal(externalUrl);
			expect(result).to.be.instanceOf(models.ViewerExternalDocument);
			expect(result.url).to.equal(externalUrl);
		});

	it("fetchAsset GETs the tenant asset endpoint and returns the raw bytes",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let payload: Uint8Array = new Uint8Array([1, 2, 3, 4]);
			let session: any = createStubSession(captured, (): any => payload.buffer);
			let manager: RestViewerManager = new RestViewerManager(session);

			let bytes: Uint8Array = await manager.fetchAsset("acme", "logo.png");

			expect(captured.method).to.equal("GET");
			expect(captured.url).to.equal("http://localhost/webPDF/rest/viewer/acme/assets/logo.png");
			expect(Array.from(bytes)).to.deep.equal([1, 2, 3, 4]);
		});
});
