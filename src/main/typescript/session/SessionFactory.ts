import {Session} from "./Session";
import {WebServiceProtocol} from "../webservice";
import {RestWebServiceSession} from "./rest";
import {ClientResultException, WsclientErrors} from "../exception";
import {SessionContext} from "./connection";
import {AuthenticationProvider, AnonymousAuthProvider} from "./auth";

/**
 * <p>
 * The {@link SessionFactory} provides the means to create a {@link Session} of a matching type, establishing and
 * managing a connection with a webPDF server.<br>
 * </p>
 * <p>
 * <b>Be Aware:</b> Should you not set an {@link AuthenticationProvider} the {@link AnonymousAuthProvider} shall be used by
 * default, and "anonymous sessions" may or may not be allowed by your webPDF server.<br>
 * <b>It is never possible to establish a session with the webPDF server without proper authorization.</b>
 * </p>
 */
export class SessionFactory {
	/**
	 * This class is not intended to be instantiated, use the static methods instead.
	 */
	private constructor() {
	}

	/**
	 * <p>
	 * Creates a HTTP or HTTPS {@link Session} with a webPDF server, based on the given {@link SessionContext} and
	 * {@link AuthenticationProvider}.
	 * </p>
	 * <p>
	 * This factory will produce a {@link RestWebServiceSession}. It is not fit to produce custom session types.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> This shall implicitly use the {@link AnonymousAuthProvider} if no {@link AuthenticationProvider}
	 * is provided, and "anonymous sessions" may or may not be allowed by your webPDF server - you should check
	 * that first, before using this factory method.<br>
	 * <b>It is never possible to establish a session with the webPDF server without proper authorization.</b>
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> Neither {@link SessionContext}, nor {@link AuthenticationProvider} are required to serve multiple
	 * {@link Session}s at a time. It is expected to create a new {@link SessionContext} and {@link AuthenticationProvider}
	 * per {@link Session} you create.
	 * </p>
	 *
	 * @param sessionContext The {@link SessionContext} containing advanced options for the {@link Session}.
	 * @param authProvider  The {@link AuthenticationProvider} to use for authentication/authorization of the {@link Session}.
	 * @return The {@link Session} organizing the communication with the webPDF server.
	 * @throws ResultException Shall be thrown in case establishing the {@link Session} failed.
	 */
	public static async createInstance<T_SESSION extends Session>(
		sessionContext: SessionContext, authProvider?: AuthenticationProvider
	): Promise<T_SESSION> {
		if (typeof authProvider === "undefined") {
			return SessionFactory.createInstance(sessionContext, new AnonymousAuthProvider());
		}

		switch (sessionContext.getWebServiceProtocol()) {
			case WebServiceProtocol.REST:
				return new RestWebServiceSession(sessionContext, authProvider) as Session as T_SESSION
			default:
				throw new ClientResultException(WsclientErrors.UNKNOWN_SESSION_TYPE);
		}
	}
}