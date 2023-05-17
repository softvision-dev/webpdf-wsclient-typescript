import {AuthMaterial} from "./AuthMaterial";
import {AbstractAuthMaterial} from "./AbstractAuthMaterial";
import {AxiosRequestHeaders} from "axios";
import {Credentials} from "./token";

/**
 * <p>
 * An instance of {@link AnonymousMaterial} serves to establish an anonymous {@link Session} via the
 * {@link AnonymousAuthProvider}.<br>
 * None of the hereby implemented methods shall provide usable authentication or authorization material.
 * </p>
 */
export class AnonymousMaterial extends AbstractAuthMaterial implements AuthMaterial {
    /**
     * {@link AnonymousMaterial} does not provide authentication {@link Credentials}.
     *
     * @return Always undefined.
     */
    getCredentials(): Credentials | undefined {
        return undefined;
    }

    /**
     * {@link AnonymousMaterial} does not provide authorization {@link AxiosRequestHeaders}.
     *
     * @return Always undefined.
     */
    public getAuthHeader(): AxiosRequestHeaders | undefined {
        return undefined;
    }

    /**
     * {@link AnonymousMaterial} does not provide authorization material.
     *
     * @return Always undefined.
     */
    getRawAuthHeader(): string | undefined {
        return undefined;
    }

    /**
     * Returns the raw String token, that shall be passed to the authorization {@link Headers}.
     *
     * @return The raw String token, that shall be passed to the authorization {@link Headers}.
     */
    getToken(): string {
        return "";
    }
}
