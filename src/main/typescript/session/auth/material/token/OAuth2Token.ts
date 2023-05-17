import {AbstractJWTToken} from "./AbstractJWTToken";

/**
 * <p>
 * An instance of {@link OAuth2Token} wraps the access token of a webPDF {@link Session} in an object.
 * </p>
 * <p>
 * Such a Token can only be obtained and refreshed, by a valid external authorization provider and can not be acquired
 * via the webPDF server.
 * </p>
 * <p>
 * <b>Important:</b> Make sure, that the token belongs to an authorization provider known to the webPDF server.
 * </p>
 */
export class OAuth2Token extends AbstractJWTToken {
    private readonly token: string;

    /**
     * Creates a new {@link OAuth2Token} for the access token determined by an OAuth provider.
     *
     * @param accessToken The access token string value.
     */
    public constructor(accessToken: string) {
        super();
        this.token = accessToken;
    }

    /**
     * Returns the access token string value.
     *
     * @return The access token string value.
     */
    public getToken(): string {
        return this.token;
    }
}