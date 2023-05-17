import {Session} from "./Session";
import {WebServiceProtocol} from "../webservice";
import {ClientResultException, WsclientErrors} from "../exception";
import {SessionContext, SessionContextSettings} from "./connection";
import {AuthenticationProvider} from "./auth";

/**
 * <p>
 * An instance of {@link AbstractSession} establishes and manages a {@link WebServiceProtocol} connection
 * with a webPDF server.
 * </p>
 */
export abstract class AbstractSession implements Session {
	private readonly webServiceProtocol: WebServiceProtocol;
	private readonly serverContext: SessionContextSettings;
	private readonly authProvider: AuthenticationProvider;
	private readonly basePath: String;
	private readonly baseUrl: URL;

	/**
	 * <p>
	 * Creates a new {@link AbstractRestSession} instance providing connection information and authorization objects
	 * for a webPDF server-client {@link Session}.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> Neither {@link SessionContext}, nor {@link AuthenticationProvider} are required to serve multiple
	 * {@link Session}s at a time. It is expected to create a new {@link SessionContext} and {@link AuthenticationProvider}
	 * per {@link Session} you create.
	 * </p>
	 *
	 * @param webServiceProtocol The {@link WebServiceProtocol} used for this {@link Session}.
	 * @param serverContext      The {@link SessionContext} initializing the {@link SessionContextSettings} of this
	 *                           {@link Session}.
	 * @param authProvider       The {@link AuthenticationProvider} for authentication/authorization of this {@link Session}.
	 * @throws ResultException Shall be thrown, in case establishing the {@link Session} failed.
	 */
	public constructor(webServiceProtocol: WebServiceProtocol, serverContext: SessionContext, authProvider: AuthenticationProvider) {
		this.serverContext = new SessionContextSettings(serverContext);
		this.authProvider = authProvider;
		this.webServiceProtocol = webServiceProtocol;
		this.basePath = "rest/";

		let toUrl: string = this.serverContext.getUrl().toString();
		if (!toUrl.endsWith("/")) {
			toUrl += "/";
		}

		// determine the base URL
		try {
			this.baseUrl = new URL(toUrl);
		} catch (ex: any) {
			throw new ClientResultException(WsclientErrors.INVALID_URL, ex);
		}
	}

	/**
	 * Provides the {@link AuthenticationProvider} for the authorization of the {@link Session}´s requests.
	 *
	 * @return {@link AuthenticationProvider} for the authorization of the {@link Session}´s requests.
	 */
	public getAuthProvider(): AuthenticationProvider {
		return this.authProvider;
	}

	/**
	 * Returns the {@link WebServiceProtocol} this {@link Session} is using.
	 *
	 * @return The {@link WebServiceProtocol} this {@link Session} is using.
	 */
	public getWebServiceProtocol(): WebServiceProtocol {
		return this.webServiceProtocol;
	}

	/**
	 * Returns the {@link SessionContextSettings} used for this session.
	 *
	 * @return The {@link SessionContextSettings} used for this session.
	 */
	public getSessionContext(): SessionContextSettings {
		return this.serverContext;
	}

	/**
	 * Returns an {@link URL} pointing to the webservice interface of the session.
	 *
	 * @param subPath The location of the webservice interface on the webPDF server.
	 * @param parameters Additional {@link URLSearchParams} parameters.
	 * @return an {@link URL} pointing to the webservice interface of the session.
	 * @throws ResultException a {@link ResultException}
	 */
	public getURL(subPath: string, parameters?: URLSearchParams): URL {
		let url = new URL(this.baseUrl);
		url.pathname += this.basePath + subPath;

		if (typeof parameters !== "undefined") {
			for (let [key, value] of parameters.entries()) {
				url.searchParams.set(key, value);
			}
		}

		return url;
	}

	/**
	 * Close the {@link Session}.
	 *
	 * @throws ResultException Shall be thrown, if closing the {@link Session} failed.
	 */
	abstract close(): Promise<void>;
}