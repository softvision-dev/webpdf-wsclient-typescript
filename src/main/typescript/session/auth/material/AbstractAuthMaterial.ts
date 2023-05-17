import {AuthMaterial} from "./AuthMaterial";
import {Credentials} from "./token";
import {AxiosHeaders, AxiosRequestHeaders} from "axios";
import {HttpHeaders} from "../../connection";

/**
 * An instance of {@link AuthMaterial} provides information for the authentication {@link #getCredentials()} and
 * authorization {@link #getAuthHeader()}/{@link #getRawAuthHeader()} of a {@link Session}.
 */
export abstract class AbstractAuthMaterial implements AuthMaterial {
	/**
	 * <p>
	 * Provides {@link Credentials} for the authentication of a {@link Session}.<br>
	 * This may validly return undefined for anonymous {@link Session}s, or in case an authentication is superfluous,
	 * because some other means is used to authorize the {@link Session}.
	 * </p>
	 *
	 * @return {@link Credentials} for the authentication of a {@link Session}.
	 */
	abstract getCredentials(): Credentials | undefined;

	/**
	 * Returns the string value of an authorization header, that shall be used by a {@link Session}.
	 *
	 * @return The string value of an authorization header, that shall be used by a {@link Session}.
	 */
	abstract getRawAuthHeader(): string | undefined;

	/**
	 * <p>
	 * Builds and returns an authorization {@link AxiosRequestHeaders} for a session.<br>
	 * This may validly return undefined for anonymous {@link Session}s.<br>
	 * Unless overridden, this method uses the result of {@link AbstractAuthMaterial#getRawAuthHeader}.
	 * </p>
	 *
	 * @return An authorization {@link AxiosRequestHeaders} for a session.
	 * @see {@link AbstractAuthMaterial#getRawAuthHeader}
	 */
	public getAuthHeader(): AxiosRequestHeaders | undefined {
		if (typeof this.getRawAuthHeader() === "undefined") {
			return undefined;
		}

		let authHeaders: AxiosRequestHeaders = new AxiosHeaders();
		authHeaders.set(HttpHeaders.AUTHORIZATION, this.getRawAuthHeader());
		return authHeaders;
	}

	/**
	 * Returns the raw String token, that shall be passed to the authorization {@link Headers}.
	 *
	 * @return The raw String token, that shall be passed to the authorization {@link Headers}.
	 */
	public getToken(): string {
		return "";
	}
}
