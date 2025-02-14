import {AuthResultException, OAuth2Provider, OAuth2Token, Session} from "../../../main/typescript";
import {AuthenticationClient} from "auth0";
import {JSONApiResponse} from "auth0/dist/esm/lib/runtime";
import {TokenSet} from "auth0/dist/esm/auth/oauth";

export class Auth0Provider implements OAuth2Provider {
	private token?: OAuth2Token;
	private readonly authority: string;
	private readonly clientId: string;
	private readonly clientSecret: string;
	private readonly audience: string;

	public constructor(
		authority: string, clientId: string, clientSecret: string, audience: string
	) {
		this.authority = authority;
		this.clientId = clientId;
		this.clientSecret = clientSecret;
		this.audience = audience;
	}

	public async provide(session: Session): Promise<OAuth2Token> {
		if (typeof this.token !== "undefined") {
			return this.token;
		}

		try {
			let auth: AuthenticationClient = new AuthenticationClient({
				domain: this.authority,
				clientId: this.clientId,
				clientSecret: this.clientSecret
			});
			let token: JSONApiResponse<TokenSet> = await auth.oauth.clientCredentialsGrant({
				audience: this.audience
			});

			this.token = new OAuth2Token(token.data.access_token);
		} catch (e: any) {
			throw new AuthResultException(e);
		}

		return this.token;
	}

	refresh(session: Session): Promise<OAuth2Token> {
		throw new Error("not implemented");
	};
}
