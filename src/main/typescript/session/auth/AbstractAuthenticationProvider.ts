import {AuthenticationProvider} from "./AuthenticationProvider";
import {AuthMaterial, instanceOfSessionToken, WSClientSessionToken} from "./material";
import {Session} from "../Session";
import {instanceOfRestSession, RestSession} from "../rest";
import {HttpMethod, HttpRestRequest} from "../connection";
import {LoginOptions, LoginOptionsInterface, SessionToken as WebpdfSessionToken} from "../../generated-sources";
import {AuthResultException} from "../../exception";
import {DataFormats} from "../DataFormat";

/**
 * <p>
 * A class extending {@link AbstractAuthenticationProvider} shall provide the means to use the webPDF server´s login
 * endpoint to authenticate a user. It shall also organize the automatic refresh of the {@link WSClientSessionToken} provided
 * by the login endpoint and shall update it´s used {@link AuthMaterial} accordingly.
 * </p>
 * <p>
 * <b>Be aware:</b> Currently an {@link AbstractAuthenticationProvider} shall only serve one {@link Session} at a time.
 * An {@link AbstractAuthenticationProvider} being called by another {@link Session} than it´s current master, shall
 * assume it´s current master to have expired and shall, try to reauthorize that new {@link Session} (new master).<br>
 * For that reason an {@link AbstractAuthenticationProvider}s shall be reusable by subsequent {@link Session}s.
 * </p>
 * <p>
 * <b>Be aware:</b> However - An implementation of {@link AuthenticationProvider} is not required to serve multiple
 * {@link Session}s at a time. It is expected to create a new {@link AuthenticationProvider} for each existing
 * {@link Session}.
 * </p>
 */
export abstract class AbstractAuthenticationProvider implements AuthenticationProvider {
	private static readonly LOGIN_PATH: string = "authentication/user/login/";
	private static readonly REFRESH_PATH: string = "authentication/user/refresh/";
	private authMaterial: AuthMaterial;
	private updating: boolean;
	private readonly initialAuthMaterial: AuthMaterial;
	private session?: Session;

	/**
	 * <p>
	 * Creates a fresh authentication provider, that shall initialize a {@link Session} using the given
	 * {@link AuthMaterial}.
	 * </p>
	 * <p>
	 * <b>Be aware:</b> possibly the given {@link AuthMaterial} will only be used during login and will be replaced
	 * with a {@link WSClientSessionToken}.
	 * </p>
	 * <p>
	 * Resumes an existing authentication provider, that shall resume a {@link Session} if a {@link WSClientSessionToken} is
	 * provided.
	 * </p>
	 * <p>
	 * <b>Be aware:</b> Currently an {@link AbstractAuthenticationProvider} shall only serve one {@link Session} at a
	 * time. An {@link AbstractAuthenticationProvider} being called by another {@link Session} than it´s current master,
	 * shall assume it´s current master to have expired and shall, try to reauthorize that new {@link Session}
	 * (new master).<br>
	 * For that reason an {@link AbstractAuthenticationProvider}s shall be reusable by subsequent {@link Session}s.
	 * </p>
	 *
	 * @param authMaterial The {@link AuthMaterial} to initialize the {@link Session} with.
	 * @param resumeAuthMaterial The optional {@link AuthMaterial} to resume the {@link Session} with.
	 */
	public constructor(authMaterial: AuthMaterial, resumeAuthMaterial?: AuthMaterial) {
		this.initialAuthMaterial = authMaterial;
		this.authMaterial = typeof resumeAuthMaterial !== "undefined" ? resumeAuthMaterial : authMaterial;
		this.updating = false;
	}

	/**
	 * Returns the current {@link Session} this {@link AuthenticationProvider} provides authorization for.
	 *
	 * @return The current {@link Session} this {@link AuthenticationProvider} provides authorization for.
	 */
	public getSession(): Session | undefined {
		return this.session;
	}

	/**
	 * Returns the initial {@link AuthMaterial} given to this {@link AuthenticationProvider}.
	 *
	 * @return The initial {@link AuthMaterial} given to this {@link AuthenticationProvider}.
	 */
	public getInitialAuthMaterial(): AuthMaterial {
		return this.initialAuthMaterial;
	}

	/**
	 * Returns the currently used {@link AuthMaterial}.
	 *
	 * @return The currently used {@link AuthMaterial}.
	 */
	protected getAuthMaterial(): AuthMaterial {
		return this.authMaterial;
	}

	/**
	 * Sets the used {@link AuthMaterial}.
	 *
	 * @param authMaterial The {@link AuthMaterial} to set.
	 */
	protected setAuthMaterial(authMaterial: AuthMaterial): void {
		this.authMaterial = authMaterial;
	}

	/**
	 * Refresh authorization {@link SessionToken} for an active {@link Session}.
	 *
	 * @param session The session to refresh the authorization for.
	 * @return The {@link AuthMaterial} refreshed by this {@link AuthenticationProvider}.
	 * @throws AuthResultException Shall be thrown, should the authentication/authorization fail for some reason.
	 */
	public async refresh(session: Session): Promise<AuthMaterial> {
		if (this.updating || !instanceOfRestSession(session)) {
			return this.getAuthMaterial();
		}

		if (!instanceOfSessionToken(this.getAuthMaterial())) {
			return await this.provide(session);
		}

		try {
			this.updating = true;
			this.session = session;
			let restSession: RestSession<any> = session as RestSession<any>;

			(this.getAuthMaterial() as WSClientSessionToken).refresh();

			let loginOptions: LoginOptions = LoginOptions.fromJson({
				createRefreshToken: true
			} as LoginOptionsInterface);

			let request: HttpRestRequest = await HttpRestRequest.createRequest(restSession)
				.buildRequest(
					HttpMethod.POST,
					restSession.getURL(AbstractAuthenticationProvider.REFRESH_PATH),
					JSON.stringify(loginOptions.toJson()),
					DataFormats.JSON.getMimeType()
				);

			let token: WebpdfSessionToken = WebpdfSessionToken.fromJson(
				await request.executeRequest()
			);

			this.setAuthMaterial(new WSClientSessionToken(token.token, token.refreshToken, token.expiresIn));
			this.updating = false;
		} catch (ex: any) {
			throw new AuthResultException(ex);
		}

		return this.getAuthMaterial();
	}

	/**
	 * Login and provide authorization {@link SessionToken} for a {@link Session}.
	 *
	 * @param session The session to provide the authorization for.
	 * @return The {@link AuthMaterial} provided by this {@link AuthenticationProvider}.
	 * @throws AuthResultException Shall be thrown, should the authentication/authorization fail for some reason.
	 */
	protected async login(session: Session): Promise<AuthMaterial> {
		if (this.updating || !instanceOfRestSession(session) || instanceOfSessionToken(this.getAuthMaterial())) {
			return this.getAuthMaterial();
		}

		try {
			this.updating = true;
			this.session = session;
			let restSession: RestSession<any> = session as RestSession<any>;

			let loginOptions: LoginOptions = LoginOptions.fromJson({
				createRefreshToken: true
			} as LoginOptionsInterface);

			let request: HttpRestRequest = await HttpRestRequest.createRequest(restSession)
				.buildRequest(
					HttpMethod.POST,
					restSession.getURL(AbstractAuthenticationProvider.LOGIN_PATH),
					JSON.stringify(loginOptions.toJson()),
					DataFormats.JSON.getMimeType(),
					this.getInitialAuthMaterial()
				);

			let token: WebpdfSessionToken = WebpdfSessionToken.fromJson(
				await request.executeRequest()
			);

			this.setAuthMaterial(new WSClientSessionToken(token.token, token.refreshToken, token.expiresIn));

			this.updating = false;
		} catch (ex: any) {
			throw new AuthResultException(ex);
		}

		return this.getAuthMaterial();
	}

	/**
	 * <p>
	 * Provides {@link AuthMaterial} for the authorization of a {@link Session}.<br>
	 * Will attempt to produce a {@link WSClientSessionToken} for {@link RestSession}s.<br>
	 * Will also refresh expired {@link WSClientSessionToken}s.
	 * </p>
	 * <p>
	 * <b>Be aware:</b> Currently an {@link AbstractAuthenticationProvider} shall only serve one {@link Session} at a
	 * time. An {@link AbstractAuthenticationProvider} being called by another {@link Session} than it´s current master,
	 * shall assume it´s current master to have expired and shall, try to reauthorize that new {@link Session}
	 * (new master).<br>
	 * For that reason an {@link AbstractAuthenticationProvider}s shall be reusable by subsequent {@link Session}s.
	 * </p>
	 *
	 * @param session The session to provide authorization for.
	 * @return The {@link AuthMaterial} provided by this {@link AuthenticationProvider}.
	 * @throws AuthResultException Shall be thrown, should the authentication/authorization fail for some reason.
	 */
	public async provide(session: Session): Promise<AuthMaterial> {
		if (this.updating || !instanceOfRestSession(session)) {
			return this.authMaterial;
		}

		if (!(instanceOfSessionToken(this.authMaterial))) {
			await this.login(session);
		}

		if (instanceOfSessionToken(this.authMaterial) && (
			(this.authMaterial as WSClientSessionToken).isExpired(session.getSessionContext().getSkewTime())
		)) {
			await this.refresh(session);
		}

		return this.authMaterial;
	}
}
