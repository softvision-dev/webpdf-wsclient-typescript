import { Session } from "../../../Session";
import {AbstractAuthMaterial} from "../AbstractAuthMaterial";
import {AuthMethods} from "../AuthMethod";
import {Credentials} from "./Credentials";

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