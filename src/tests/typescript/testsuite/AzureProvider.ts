import {AuthResultException, ClientResultException, OAuth2Provider, OAuth2Token, Session, WsclientErrors} from "../../../main/typescript";
import {ConfidentialClientApplication} from '@azure/msal-node';
import {AuthenticationResult} from "@azure/msal-common";

export class AzureProvider implements OAuth2Provider {
	private token?: OAuth2Token;
	private readonly authority: string;
	private readonly clientId: string;
	private readonly clientSecret: string;
	private readonly scope: string;

	public constructor(
		authority: string, clientId: string, clientSecret: string, scope: string
	) {
		this.authority = authority;
		this.clientId = clientId;
		this.clientSecret = clientSecret;
		this.scope = scope;
	}

	public async provide(session: Session): Promise<OAuth2Token> {
		if (typeof this.token !== "undefined") {
			return this.token;
		}

		try {
			let app: ConfidentialClientApplication = new ConfidentialClientApplication({
				auth: {
					authority: this.authority,
					clientId: this.clientId,
					clientSecret: this.clientSecret
				}
			});

			let response: AuthenticationResult | null = await app.acquireTokenByClientCredential({
				scopes: [this.scope]
			});

			if (response === null) {
				throw new ClientResultException(WsclientErrors.AUTHENTICATION_FAILURE);
			}

			this.token = new OAuth2Token(response.accessToken);
		} catch (e: any) {
			throw new AuthResultException(e);
		}

		return this.token;
	}

	refresh(session: Session): Promise<OAuth2Token> {
		throw new Error("not implemented");
	};
}
