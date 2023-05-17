import {OAuthConfig} from "./OAuthConfig";

/**
 * <p>
 * Example implementation that reads the value of Azure client claims from the given json config file.<br>
 * As said: This is just an example - Feel free to provide the claims in the way most fitting for your application.
 * </p>
 * <p>
 * You can find a documentation of Azure access tokens here:
 * <a href="https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-acquire-cache-tokens">
 * Request Azure access tokens (MSAL)</a>
 * </p>
 */
export class AzureConfig extends OAuthConfig {
	public static readonly OAUTH_AZURE_CONFIG_NODE: string = "/oAuth/azureClient";

	/**
	 * <p>
	 * Example implementation that reads the value of Azure client claims from the given json config file.<br>
	 * As said: This is just an example - Feel free to provide the claims in the way most fitting for your
	 * application.<br>
	 * <b>Be aware:</b> The values and names of the claims, that need to be defined are depending on the used
	 * provider.<br>
	 * <b>Be aware:</b> Said authorization provider must also be configured for your webPDF server. (server.xml)
	 * </p>
	 *
	 * @param clientID A json config node, that contains all claims required to request the access token from
	 *                 the authorization provider.
	 */
	public constructor(clientID: any) {
		super(clientID);
	}

	/**
	 * Returns the value of the claim "authority".
	 *
	 * @return The value of the "authority" claim.
	 */
	public getAuthority(): string {
		return this.getString("authority", "");
	}

	/**
	 * Returns the value of the claim "clientId".
	 *
	 * @return The value of the "clientId" claim.
	 */
	public getClientID(): string {
		return this.getString("clientId", "");
	}

	/**
	 * Returns the value of the claim "clientSecret".
	 *
	 * @return The value of the "clientSecret" claim.
	 */
	public getClientSecret(): string {
		return this.getString("clientSecret", "");
	}

	/**
	 * Returns the value of the claim "scope".
	 *
	 * @return The value of the "scope" claim.
	 */
	public getScope(): string {
		return this.getString("scope", "");
	}
}
