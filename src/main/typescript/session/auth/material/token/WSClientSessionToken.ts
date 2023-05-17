import {AbstractJWTToken} from "./AbstractJWTToken";

/**
 * <p>
 * An instance of {@link WSClientSessionToken} wraps the access and refresh tokens provided by the webPDF server.
 * </p>
 */
export class WSClientSessionToken extends AbstractJWTToken {
	private token: string;
	private refreshToken: string;
	private expiresIn: number;
	private expiration: Date;

	/**
	 * Creates a new {@link WSClientSessionToken} from preexisting token values.
	 *
	 * @param accessToken  The access token string value.
	 * @param refreshToken The refresh token string value.
	 * @param expiresIn    The token expiry time in seconds.
	 */
	public constructor(accessToken?: string, refreshToken?: string, expiresIn?: number) {
		super();

		this.expiration = new Date();
		this.expiration.setSeconds(
			this.expiration.getSeconds() + (typeof expiresIn !== "undefined" ? expiresIn : -1)
		);
		this.token = typeof accessToken !== "undefined" ? accessToken : "";
		this.refreshToken = typeof refreshToken !== "undefined" ? refreshToken : "";
		this.expiresIn = typeof expiresIn !== "undefined" ? expiresIn : -1;
	}

	/**
	 * Returns the access token string value. Shall return an empty String for an uninitialized session.
	 *
	 * @return The access token string value.
	 */
	public getToken(): string {
		return this.token;
	}

	/**
	 * <p>
	 * Replaces the access token with the refresh token.
	 * </p>
	 * <p>
	 * <b>Be aware:</b> Using the refresh token as auth material is only valid and advisable while refreshing the
	 * webPDF access token - other calls to the server will fail until a new access token is provided.<br>
	 * Synchronization of webservice calls is absolutely necessary during a token refresh and it is recommended to delay
	 * other calls until a fresh and valid access token is available.<br>
	 * This {@link WSClientSessionToken} should be discarded after refreshing the token has finished.
	 * </p>
	 */
	public refresh(): void {
		this.token = this.refreshToken;
	}

	/**
	 * Returns the {@link Date} the {@link WSClientSessionToken} will expire at.
	 *
	 * @return The {@link Date} the {@link WSClientSessionToken} will expire at.
	 */
	public getExpiration(): Date {
		return this.expiration;
	}

	/**
	 * Returns the refresh token string value. Shall return an empty String for an uninitialized session.
	 *
	 * @return The refresh token string value.
	 */
	public getRefreshToken(): string {
		return this.refreshToken;
	}

	/**
	 * Returns true, if the current access token is expired and {@link #refresh()} should be called to request
	 * a new access token for the {@link Session}.
	 *
	 * @param skewTime An additional skew time, in seconds, that is added during expiry evaluation.
	 *                 (Adding a skew time helps in avoiding to use expired access tokens because of transfer delays.)
	 * @return true, if the current access token is expired.
	 */
	public isExpired(skewTime: number): boolean {
		return this.expiration.getTime() < Date.now() + skewTime;
	}
}

export function instanceOfSessionToken(object: any): boolean {
	return 'getCredentials' in object &&
		'getRawAuthHeader' in object &&
		'getAuthHeader' in object &&
		'getToken' in object &&
		'getRefreshToken' in object &&
		'refresh' in object &&
		'getExpiration' in object &&
		'isExpired' in object;
}