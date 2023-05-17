import {Credentials} from "./token";
import {AxiosRequestHeaders} from "axios";
import { Session } from "../../Session";

/**
 * An instance of {@link AuthMaterial} provides information for the authentication {@link #getCredentials()} and
 * authorization {@link #getAuthHeader()}/{@link #getRawAuthHeader()} of a {@link Session}.
 */
export interface AuthMaterial {
    /**
     * <p>
     * Provides {@link Credentials} for the authentication of a {@link Session}.<br>
     * This may validly return undefined for anonymous {@link Session}s, or in case an authentication is superfluous,
     * because some other means is used to authorize the {@link Session}.
     * </p>
     *
     * @return {@link Credentials} for the authentication of a {@link Session}.
     */
    getCredentials(): Credentials | undefined;

    /**
     * <p>
     * Builds and returns an authorization {@link AxiosRequestHeaders} for a session.<br>
     * This may validly return undefined for anonymous {@link Session}s.<br>
     * Unless overridden, this method uses the result of {@link AuthMaterial#getRawAuthHeader}.
     * </p>
     *
     * @return An authorization {@link AxiosRequestHeaders} for a session.
     * @see {@link AuthMaterial#getRawAuthHeader}
     */
    getAuthHeader(): AxiosRequestHeaders | undefined

    /**
     * Returns the string value of an authorization header, that shall be used by a {@link Session}.
     *
     * @return The string value of an authorization header, that shall be used by a {@link Session}.
     */
    getRawAuthHeader(): string | undefined;

    /**
     * Returns the raw String token, that shall be passed to the authorization {@link Headers}.
     *
     * @return The raw String token, that shall be passed to the authorization {@link Headers}.
     */
    getToken(): string
}
