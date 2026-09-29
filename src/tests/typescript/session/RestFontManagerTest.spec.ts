import {expect} from "chai";
import {it, suite} from "mocha";
import {ClientResultException, models, RestFontManager} from "../../../main/typescript/index.js";
import {CapturedRequest, createStubSession, StubHttpFailure} from "./StubRestSession.js";

const BASE: string = "http://localhost/webPDF/rest/";

/**
 * The page the servlet container renders for an error status without a body.
 */
function containerErrorPage(status: number, reason: string): StubHttpFailure {
	return new StubHttpFailure(
		status,
		reason,
		{"content-type": "text/html;charset=utf-8", "content-language": "en"},
		"<!doctype html><html lang=\"en\"><head><title>HTTP Status " + status + " - " + reason +
		"</title></head><body><h1>HTTP Status " + status + " - " + reason + "</h1></body></html>"
	);
}

/**
 * Awaits the given promise and returns what it rejected with; fails the test when it resolves.
 */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
	} catch (error: unknown) {
		return error;
	}
	expect.fail("the request was expected to fail");
}

/**
 * A catalog as the server answers it while both web services run.
 */
function runningCatalog(): any {
	return {
		sources: {
			toolbox: {
				status: "ok",
				readsSystemFontFolder: true,
				defaultFont: {
					name: "Helvetica",
					cuts: [
						{id: "Hq3zR0bA9kLmNpQw", style: "plain"},
						{id: "Vt5-yU_2oI8pAsDf", style: "bold"}
					]
				},
				families: [
					{
						name: "Arial",
						page: 0,
						cuts: [
							{id: "3j7My-3d4Fmi9iaY", style: "plain"},
							{id: "b_2Kx9QvT0rLmZ4a", style: "bold"},
							{id: "Wc8-nE1_rT6yUi0o", style: "italic"},
							{id: "Zx4_cV7-bN2mQw9e", style: "boldItalic"}
						]
					},
					{name: "Courier New", page: 1, cuts: [{id: "x9_Lm2Qa-0PzR7tK", style: "plain"}]}
				],
				previewPages: [{key: "Pq-4zX_1nB8cD2eF"}, {key: "Gh5_jK6-lL7zX8cV"}]
			},
			converter: {
				status: "ok",
				readsSystemFontFolder: false,
				defaultFont: {name: "Liberation Sans"},
				families: [{name: "Liberation Sans", page: 0, cuts: [{id: "Rt6-yU7_iO8pA9sD", style: "plain"}]}],
				previewPages: [{key: "Mn2-bV3_cX4zL5kJ"}]
			}
		}
	};
}

/**
 * Answers a request with a realistic body for the endpoint it addresses, for tests whose subject is the
 * request rather than the answer.
 */
function realisticAnswer(config: any): any {
	let path: string = new URL(config.url).pathname;
	if (path.includes("/portal/fonts/previews/")) {
		return {key: "Pq-4zX_1nB8cD2eF", unitsPerEm: 128, previews: []};
	}
	if (path.includes("/portal/fonts/metrics/")) {
		return {id: "3j7My-3d4Fmi9iaY", unitsPerEm: 1000, usable: false, glyphs: [], unsupported: []};
	}
	return runningCatalog();
}

suite("RestFontManagerTest", function (): void {
	// Catches: wrong path or method, the session's auth header not attached, a non-JSON Accept header.
	it("fetchCatalog GETs the font catalog with the session's bearer authorization",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, runningCatalog));

			await manager.fetchCatalog();

			expect(captured.method).to.equal("GET");
			expect(captured.url).to.equal(BASE + "portal/fonts");
			expect(captured.headers?.["Authorization"]).to.equal("Bearer TEST");
			expect(captured.headers?.["Accept"]).to.equal("application/json");
		});

	// Catches: returning the catalog with raw map values - FontCatalog alone does not hydrate its
	// 'sources' map - and leaving the cuts of a family raw.
	it("fetchCatalog returns every source and everything below it as model instances",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, runningCatalog));

			let catalog: models.FontCatalog = await manager.fetchCatalog();

			expect(catalog).to.be.instanceOf(models.FontCatalog);
			expect(Object.keys(catalog.sources ?? {})).to.have.members(["toolbox", "converter"]);

			let toolbox: models.FontSource | undefined = catalog.sources?.["toolbox"];
			expect(toolbox).to.be.instanceOf(models.FontSource);
			expect(toolbox?.status).to.equal(models.WebserviceStatus.Ok);
			expect(toolbox?.readsSystemFontFolder).to.equal(true);
			expect(toolbox?.defaultFont).to.be.instanceOf(models.FontDefault);
			expect(toolbox?.defaultFont?.name).to.equal("Helvetica");
			expect(toolbox?.defaultFont?.cuts?.[1]).to.be.instanceOf(models.FontCut);
			expect(toolbox?.defaultFont?.cuts?.[1].id).to.equal("Vt5-yU_2oI8pAsDf");
			expect(toolbox?.families).to.have.length(2);
			expect(toolbox?.families?.[0]).to.be.instanceOf(models.FontFamily);
			expect(toolbox?.families?.[0].name).to.equal("Arial");
			expect(toolbox?.families?.[1].page).to.equal(1);
			expect(toolbox?.families?.[0].cuts).to.have.length(4);
			for (let cut of toolbox?.families?.[0].cuts ?? []) {
				expect(cut).to.be.instanceOf(models.FontCut);
			}
			expect(toolbox?.families?.[0].cuts?.[0].id).to.equal("3j7My-3d4Fmi9iaY");
			expect(toolbox?.families?.[0].cuts?.[3].style).to.equal(models.FontStyle.BoldItalic);
			expect(toolbox?.previewPages?.[0]).to.be.instanceOf(models.FontPreviewPageRef);
			expect(toolbox?.previewPages?.map((page: models.FontPreviewPageRef): string => page.key))
				.to.deep.equal(["Pq-4zX_1nB8cD2eF", "Gh5_jK6-lL7zX8cV"]);

			let converter: models.FontSource | undefined = catalog.sources?.["converter"];
			expect(converter).to.be.instanceOf(models.FontSource);
			expect(converter?.readsSystemFontFolder).to.equal(false);
			expect(converter?.defaultFont?.name).to.equal("Liberation Sans");
			// the converter passes its default font on by name: no cuts in the answer
			expect(converter?.defaultFont?.cuts).to.deep.equal([]);
			expect(converter?.families?.[0]).to.be.instanceOf(models.FontFamily);
			expect(converter?.families?.[0].cuts?.[0]).to.be.instanceOf(models.FontCut);
			expect(converter?.families?.[0].cuts?.[0].id).to.equal("Rt6-yU7_iO8pA9sD");
			expect(converter?.previewPages?.[0].key).to.equal("Mn2-bV3_cX4zL5kJ");
		});

	// Catches: dropping a source that carries no font data, or failing on the missing families
	// (e.g. mapping over an undefined list while hydrating the cuts).
	it("fetchCatalog keeps a source without font data as a FontSource with its status and no families",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, (): any => ({
				sources: {
					toolbox: runningCatalog().sources.toolbox,
					converter: {status: "disabled"}
				}
			})));

			let catalog: models.FontCatalog = await manager.fetchCatalog();

			let converter: models.FontSource | undefined = catalog.sources?.["converter"];
			expect(converter).to.be.instanceOf(models.FontSource);
			expect(converter?.status).to.equal(models.WebserviceStatus.Disabled);
			// FontSource falls back to empty lists and no default font for an absent value
			expect(converter?.families).to.deep.equal([]);
			expect(converter?.previewPages).to.deep.equal([]);
			expect(converter?.defaultFont).to.equal(undefined);
			expect(catalog.sources?.["toolbox"]?.families?.[0].cuts?.[0]).to.be.instanceOf(models.FontCut);
		});

	// Catches: wrong path; the base64url characters '-' and '_' must reach the server unchanged.
	it("fetchPreviewPage GETs the page of the given key",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, (): any => ({
				key: "Pq-4zX_1nB8cD2eF", unitsPerEm: 128, previews: []
			})));

			await manager.fetchPreviewPage("Pq-4zX_1nB8cD2eF");

			expect(captured.method).to.equal("GET");
			expect(captured.url).to.equal(BASE + "portal/fonts/previews/Pq-4zX_1nB8cD2eF");
			expect(captured.headers?.["Authorization"]).to.equal("Bearer TEST");
		});

	// Catches: a key concatenated into the path without encoding, which would change the path or turn
	// into a query or fragment.
	it("fetchPreviewPage path-encodes the key",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, realisticAnswer));

			await manager.fetchPreviewPage("a/b?c#d e");

			expect(captured.url).to.equal(BASE + "portal/fonts/previews/a%2Fb%3Fc%23d%20e");
		});

	// Catches: returning the page with raw previews - FontPreviewPage alone does not hydrate its
	// required 'previews' list.
	it("fetchPreviewPage returns the page with its previews as model instances",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, (): any => ({
				key: "Pq-4zX_1nB8cD2eF",
				unitsPerEm: 128,
				previews: [
					{
						id: "3j7My-3d4Fmi9iaY", name: "Arial", ascent: 116, descent: -27, width: 312,
						complete: true, path: "m12 0l30 -92l10 0l30 92z"
					},
					{
						id: "k2_Jh7-Gf4dS1aPo", name: "Symbol", ascent: 128, descent: -28, width: 280,
						complete: false, path: "m0 0q14 -60 28 0z"
					}
				]
			})));

			let page: models.FontPreviewPage = await manager.fetchPreviewPage("Pq-4zX_1nB8cD2eF");

			expect(page).to.be.instanceOf(models.FontPreviewPage);
			expect(page.key).to.equal("Pq-4zX_1nB8cD2eF");
			expect(page.unitsPerEm).to.equal(128);
			expect(page.previews).to.have.length(2);
			expect(page.previews?.[0]).to.be.instanceOf(models.FontPreview);
			expect(page.previews?.[1]).to.be.instanceOf(models.FontPreview);
			expect(page.previews?.[0].complete).to.equal(true);
			expect(page.previews?.[1].complete).to.equal(false);
			expect(page.previews?.[0].path).to.equal("m12 0l30 -92l10 0l30 92z");
			expect(page.previews?.[0].descent).to.equal(-27);
			expect(page.previews?.[1].name).to.equal("Symbol");
		});

	// Catches: sending the code points as given - the server rejects unsorted or duplicated ones with 400.
	it("fetchMetrics GETs the metrics of the cut with the code points sorted and without duplicates",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, realisticAnswer));

			await manager.fetchMetrics("3j7My-3d4Fmi9iaY", [66, 65, 65, 8364]);

			expect(captured.method).to.equal("GET");
			expect(captured.headers?.["Authorization"]).to.equal("Bearer TEST");
			let url: URL = new URL(captured.url as string);
			expect(url.origin + url.pathname).to.equal(BASE + "portal/fonts/metrics/3j7My-3d4Fmi9iaY");
			expect(url.searchParams.getAll("codepoints")).to.deep.equal(["65,66,8364"]);
		});

	// Catches: the default (lexicographic) Array sort, which orders 1000 before 99, and a truthiness
	// filter that drops code point 0.
	it("fetchMetrics sorts the code points numerically and keeps code point 0",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, realisticAnswer));

			await manager.fetchMetrics("3j7My-3d4Fmi9iaY", [1000, 99, 0, 99, 5]);

			expect(new URL(captured.url as string).searchParams.get("codepoints")).to.equal("0,5,99,1000");
		});

	// Catches: sorting or de-duplicating the caller's array in place.
	it("fetchMetrics leaves the caller's code point array unchanged",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, realisticAnswer));
			let codepoints: Array<number> = [66, 65, 65, 8364];

			await manager.fetchMetrics("3j7My-3d4Fmi9iaY", codepoints);

			expect(codepoints).to.deep.equal([66, 65, 65, 8364]);
		});

	// Catches: sending an empty 'codepoints=' (or 'codepoints=undefined') instead of leaving it out.
	it("fetchMetrics sends no codepoints parameter without code points",
		async function (): Promise<void> {
			for (let codepoints of [undefined, []] as Array<Array<number> | undefined>) {
				let captured: CapturedRequest = {};
				let manager: RestFontManager = new RestFontManager(createStubSession(captured, realisticAnswer));

				await manager.fetchMetrics("3j7My-3d4Fmi9iaY", codepoints);

				let url: URL = new URL(captured.url as string);
				expect(url.origin + url.pathname).to.equal(BASE + "portal/fonts/metrics/3j7My-3d4Fmi9iaY");
				expect(url.searchParams.has("codepoints"), "for " + JSON.stringify(codepoints)).to.equal(false);
				expect(url.search, "for " + JSON.stringify(codepoints)).to.equal("");
			}
		});

	// Catches: an identifier concatenated into the path without encoding.
	it("fetchMetrics path-encodes the identifier",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, realisticAnswer));

			await manager.fetchMetrics("a/b?c#d e");

			let url: URL = new URL(captured.url as string);
			expect(url.pathname).to.equal("/webPDF/rest/portal/fonts/metrics/a%2Fb%3Fc%23d%20e");
			expect(url.search).to.equal("");
		});

	// Catches: returning the metrics with raw glyphs - FontMetrics alone does not hydrate its required
	// 'glyphs' list.
	it("fetchMetrics returns the metrics with their glyphs as model instances",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, (): any => ({
				id: "3j7My-3d4Fmi9iaY",
				unitsPerEm: 1000,
				usable: true,
				descent: -212,
				lineBoxHeight: 1117,
				glyphs: [
					{codepoint: 32, width: 278, path: ""},
					{codepoint: 65, width: 667, path: "m0 0l292 -716l84 0l292 716z"}
				],
				unsupported: [8364]
			})));

			let metrics: models.FontMetrics = await manager.fetchMetrics("3j7My-3d4Fmi9iaY", [65, 32, 8364]);

			expect(metrics).to.be.instanceOf(models.FontMetrics);
			expect(metrics.id).to.equal("3j7My-3d4Fmi9iaY");
			expect(metrics.usable).to.equal(true);
			expect(metrics.unitsPerEm).to.equal(1000);
			expect(metrics.lineBoxHeight).to.equal(1117);
			expect(metrics.descent).to.equal(-212);
			expect(metrics.glyphs).to.have.length(2);
			expect(metrics.glyphs?.[0]).to.be.instanceOf(models.FontGlyph);
			expect(metrics.glyphs?.[1]).to.be.instanceOf(models.FontGlyph);
			expect(metrics.glyphs?.[0].path).to.equal("");
			expect(metrics.glyphs?.[1].codepoint).to.equal(65);
			expect(metrics.glyphs?.[1].width).to.equal(667);
			expect(metrics.unsupported).to.deep.equal([8364]);
		});

	// Catches: swallowing an error status, or losing the HTTP status on the way to the caller - the
	// caller tells "unknown key" (404), "bad request" (400) and "retry later" (503) apart by it.
	it("rejects with a ClientResultException carrying the HTTP status of a failed request",
		async function (): Promise<void> {
			let retryLater: StubHttpFailure = new StubHttpFailure(
				503, "Service Unavailable", {"retry-after": "1", "content-length": "0"}, ""
			);
			let cases: Array<{name: string, failure: StubHttpFailure, call: (manager: RestFontManager) => Promise<unknown>}> = [
				{
					name: "fetchCatalog 503",
					failure: retryLater,
					call: (manager: RestFontManager): Promise<unknown> => manager.fetchCatalog()
				},
				{
					name: "fetchPreviewPage 404",
					failure: containerErrorPage(404, "Not Found"),
					call: (manager: RestFontManager): Promise<unknown> => manager.fetchPreviewPage("Pq-4zX_1nB8cD2eF")
				},
				{
					name: "fetchPreviewPage 503",
					failure: retryLater,
					call: (manager: RestFontManager): Promise<unknown> => manager.fetchPreviewPage("Pq-4zX_1nB8cD2eF")
				},
				{
					name: "fetchMetrics 404",
					failure: containerErrorPage(404, "Not Found"),
					call: (manager: RestFontManager): Promise<unknown> => manager.fetchMetrics("3j7My-3d4Fmi9iaY", [65])
				},
				{
					name: "fetchMetrics 400",
					failure: containerErrorPage(400, "Bad Request"),
					call: (manager: RestFontManager): Promise<unknown> => manager.fetchMetrics("3j7My-3d4Fmi9iaY", [65])
				},
				{
					name: "fetchMetrics 503",
					failure: retryLater,
					call: (manager: RestFontManager): Promise<unknown> => manager.fetchMetrics("3j7My-3d4Fmi9iaY")
				}
			];

			for (let testCase of cases) {
				let captured: CapturedRequest = {};
				let manager: RestFontManager = new RestFontManager(
					createStubSession(captured, (): StubHttpFailure => testCase.failure)
				);

				let error: unknown = await rejectionOf(testCase.call(manager));

				expect(error, testCase.name).to.be.instanceOf(ClientResultException);
				expect((error as ClientResultException).getHttpErrorCode(), testCase.name)
					.to.equal(testCase.failure.status);
			}
		});

	// Catches: an abort signal that is accepted but never handed to the request.
	it("passes the abort signal on to the request of every method",
		async function (): Promise<void> {
			let captured: CapturedRequest = {};
			let manager: RestFontManager = new RestFontManager(createStubSession(captured, realisticAnswer));

			let catalogAbort: AbortController = new AbortController();
			await manager.fetchCatalog({abortSignal: catalogAbort.signal});
			expect(captured.signal).to.equal(catalogAbort.signal);

			let pageAbort: AbortController = new AbortController();
			await manager.fetchPreviewPage("Pq-4zX_1nB8cD2eF", {abortSignal: pageAbort.signal});
			expect(captured.signal).to.equal(pageAbort.signal);

			let metricsAbort: AbortController = new AbortController();
			await manager.fetchMetrics("3j7My-3d4Fmi9iaY", [65], {abortSignal: metricsAbort.signal});
			expect(captured.signal).to.equal(metricsAbort.signal);

			let noCodepointsAbort: AbortController = new AbortController();
			await manager.fetchMetrics("3j7My-3d4Fmi9iaY", undefined, {abortSignal: noCodepointsAbort.signal});
			expect(captured.signal).to.equal(noCodepointsAbort.signal);
		});
});
