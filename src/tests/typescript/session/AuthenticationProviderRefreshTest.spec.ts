import {expect} from "chai";
import {it, suite} from "mocha";
import {
	AbstractAuthenticationProvider,
	AuthMaterial,
	AuthResultException,
	WSClientSessionToken
} from "../../../main/typescript";

/**
 * Minimal concrete subclass that exposes the protected/private internals needed to assert
 * the refresh behavior of {@link AbstractAuthenticationProvider}.
 */
class TestAuthProvider extends AbstractAuthenticationProvider {
	public peekAuthMaterial(): AuthMaterial {
		return this.getAuthMaterial();
	}

	public isUpdating(): boolean {
		return (this as unknown as { updating: boolean }).updating;
	}
}

/**
 * Finds the Authorization header value case-insensitively in a captured request header map.
 */
function findAuthorization(headers: Record<string, any> | undefined): string | undefined {
	if (typeof headers === "undefined") {
		return undefined;
	}

	for (let key of Object.keys(headers)) {
		if (key.toLowerCase() === "authorization") {
			return headers[key] as string;
		}
	}

	return undefined;
}

/**
 * Builds a stub RestSession sufficient for the auth provider: it satisfies instanceOfRestSession
 * duck-typing, resolves URLs, and routes HTTP requests through the supplied handler.
 */
function createStubSession(requestHandler: (config: any) => Promise<any>): any {
	let httpClient: { request: (config: any) => Promise<any> } = {
		request: requestHandler
	};

	return {
		getHttpClient: (): any => httpClient,
		getURL: (subPath: string): URL => new URL("http://localhost/webPDF/rest/" + subPath),
		// Members required by instanceOfRestSession duck-typing:
		getDocumentManager: (): void => undefined,
		uploadDocument: (): void => undefined,
		getAdministrationManager: (): void => undefined,
		getUser: (): void => undefined,
		getCertificates: (): void => undefined,
		updateCertificates: (): void => undefined,
		createWebServiceInstance: (): void => undefined
	};
}

suite("AuthenticationProviderRefreshTest", function (): void {
	it("authorizes refresh with the refresh token and stores the new access token without mutating the old token (regression: C2+)",
		async function (): Promise<void> {
			let capturedAuthorization: string | undefined;
			let session: any = createStubSession(async (config: any): Promise<any> => {
				capturedAuthorization = findAuthorization(config.headers);
				return {
					status: 200,
					headers: {"content-type": "application/json"},
					data: {token: "NEW_ACCESS", refreshToken: "NEW_REFRESH", expiresIn: 3600}
				};
			});

			let seedToken: WSClientSessionToken = new WSClientSessionToken("ACCESS", "REFRESH", 3600);
			let provider: TestAuthProvider = new TestAuthProvider(seedToken);

			let result: AuthMaterial = await provider.refresh(session);

			// The refresh call itself must be authorized with the (old) refresh token.
			expect(capturedAuthorization, "refresh request must be authorized with the refresh token")
				.to.equal("Bearer REFRESH");
			// The provider must now hold the freshly issued access token.
			expect((result as WSClientSessionToken).getToken()).to.equal("NEW_ACCESS");
			expect((provider.peekAuthMaterial() as WSClientSessionToken).getToken()).to.equal("NEW_ACCESS");
			// The original token instance must NOT have been mutated into the refresh token
			// (this is the actual leak the fix prevents).
			expect(seedToken.getToken(), "live access token must not be mutated to the refresh token")
				.to.equal("ACCESS");
			// The updating guard must be released.
			expect(provider.isUpdating()).to.equal(false);
		});

	it("releases the updating guard and keeps the token unmutated when refresh fails (regression: C2+)",
		async function (): Promise<void> {
			let session: any = createStubSession(async (): Promise<any> => {
				throw new Error("network down");
			});

			let seedToken: WSClientSessionToken = new WSClientSessionToken("ACCESS", "REFRESH", 3600);
			let provider: TestAuthProvider = new TestAuthProvider(seedToken);

			let thrown: unknown;
			try {
				await provider.refresh(session);
			} catch (ex: unknown) {
				thrown = ex;
			}

			expect(thrown, "a failed refresh must surface an exception").to.be.instanceOf(AuthResultException);
			// The provider must not be permanently stuck in the updating state.
			expect(provider.isUpdating(), "updating guard must be reset after a failed refresh").to.equal(false);
			// The live token must remain the original access token (no leak / poisoning).
			expect(seedToken.getToken()).to.equal("ACCESS");
		});
});
