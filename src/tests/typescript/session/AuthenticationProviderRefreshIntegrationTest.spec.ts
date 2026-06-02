import {ServerType, TestConfig, TestServer} from "../testsuite";
import {expect} from "chai";
import {
	AbstractAuthenticationProvider,
	AnonymousAuthProvider,
	RestDocument,
	RestSession,
	SessionContext,
	SessionFactory,
	WebServiceProtocol,
	WSClientSessionToken
} from "../../../main/typescript";
import {it, suite} from "mocha";

/**
 * End-to-end validation of the token refresh against a live webPDF server.
 *
 * Uses an anonymous session (no credentials required) and refreshes twice. The refresh endpoint
 * is authorized with the refresh token, so a successful refresh proves the Authorization header is
 * built correctly end-to-end. Refreshing twice exercises refresh-token rotation, which the previous
 * in-place token mutation bug (C2+) would have broken on the second call.
 */
suite("AuthenticationProviderRefreshIntegrationTest", function (): void {
	let testServer: TestServer = new TestServer();

	it("refreshes an anonymous session twice against the live server without breaking auth (regression: C2+)",
		async function (): Promise<void> {
			if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
				this.skip();
				return;
			}

			let session: RestSession<RestDocument> = await SessionFactory.createInstance(
				new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
				new AnonymousAuthProvider()
			);

			try {
				let provider: AbstractAuthenticationProvider =
					session.getAuthProvider() as AbstractAuthenticationProvider;

				let initial: WSClientSessionToken = (await provider.provide(session)) as WSClientSessionToken;
				expect(initial.getToken(), "anonymous login should yield an access token").to.not.be.empty;

				let firstRefresh: WSClientSessionToken = (await provider.refresh(session)) as WSClientSessionToken;
				expect(firstRefresh.getToken(), "first refresh should yield an access token").to.not.be.empty;
				// The stored material must be the new access token, never the refresh token.
				expect(firstRefresh.getToken()).to.not.equal(initial.getRefreshToken());

				let secondRefresh: WSClientSessionToken = (await provider.refresh(session)) as WSClientSessionToken;
				expect(secondRefresh.getToken(), "second refresh should still succeed (no stuck/mutated state)")
					.to.not.be.empty;
				expect(secondRefresh.getToken()).to.not.equal(firstRefresh.getRefreshToken());
			} finally {
				await session.close();
			}
		});
});
