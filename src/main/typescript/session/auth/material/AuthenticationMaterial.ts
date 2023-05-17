import {AbstractAuthMaterial} from "./AbstractAuthMaterial";
import {Credentials} from "./token";
import {AuthMethods} from "./AuthMethod";
import {wsclientConfiguration} from "../../../configuration";

/**
 * <p>
 * An instance of {@link AuthenticationMaterial} serves to establish a user based {@link Session} with the webPDF
 * server.<br>
 * It shall both provide {@link Credentials} for a user, and a proper authorization {@link Headers} to
 * communicate the authentication attempt to the server.
 * </p>
 */
export class AuthenticationMaterial extends AbstractAuthMaterial {
	private readonly userName: string;
	private readonly password: string;

	/**
	 * <p>
	 * Instantiates fresh {@link AuthenticationMaterial} for the given user, using the given password.
	 * </p>
	 *
	 * @param user     The username to authenticate.
	 * @param password The password of the authenticated user.
	 */
	public constructor(user: string, password: string) {
		super();

		this.userName = user;
		this.password = password;
	}

	/**
	 * Returns the user´s {@link Credentials}.
	 *
	 * @return The user´s {@link Credentials}.
	 */
	public getCredentials(): Credentials | undefined {
		return new Credentials(this.userName, this.password);
	}

	/**
	 * Returns a new {@link AuthMethod#BASIC_AUTHORIZATION} header using the given {@link Credentials}.
	 *
	 * @return A new {@link AuthMethod#BASIC_AUTHORIZATION} header using the given {@link Credentials}.
	 */
	public getRawAuthHeader(): string | undefined {
		return AuthMethods.BASIC_AUTHORIZATION.getKey() + " " + this.getToken();
	}

	/**
	 * Returns the raw String token, that shall be passed to the authorization {@link Headers}.
	 *
	 * @return The raw String token, that shall be passed to the authorization {@link Headers}.
	 */
	public getToken(): string {
		return wsclientConfiguration.btoa(this.userName + ":" + this.password);
	}
}
