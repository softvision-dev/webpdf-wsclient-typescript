import {Session} from "../../../Session.js";
import {AbstractAuthMaterial} from "../AbstractAuthMaterial.js";
import {AuthMethods} from "../AuthMethod.js";
import {Credentials} from "./Credentials.js";

/**
 * An instance of {@link AbstractJWTToken} wraps an access token that can be used to authorize a webPDF server {@link Session}.
 */
export abstract class AbstractJWTToken extends AbstractAuthMaterial {
	/**
	 * Returns the string value of an authorization header, that shall be used by a {@link Session}.
	 *
	 * @return The string value of an authorization header, that shall be used by a {@link Session}.
	 */
	getRawAuthHeader(): string | undefined {
		return AuthMethods.BEARER_AUTHORIZATION.getKey() + " " + this.getToken();
	}

	/**
	 * <p>
	 * Provides {@link Credentials} for the authentication of a {@link Session}.<br>
	 * This may validly return undefined for anonymous {@link Session}s, or in case an authentication is superfluous,
	 * because some other means is used to authorize the {@link Session}.
	 * </p>
	 *
	 * @return {@link Credentials} for the authentication of a {@link Session}.
	 */
	getCredentials(): Credentials | undefined {
		return undefined;
	}
}