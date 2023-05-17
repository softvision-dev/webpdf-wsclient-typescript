import {WebServiceProtocol} from "../webservice";
import {AuthenticationProvider} from "./auth";
import {SessionContextSettings} from "./connection";

export interface Session {
	/**
	 * Returns the {@link WebServiceProtocol} this {@link Session} is using.
	 *
	 * @return The {@link WebServiceProtocol} this {@link Session} is using.
	 */
	getWebServiceProtocol(): WebServiceProtocol

	/**
	 * Returns the {@link SessionContextSettings} used for this session.
	 *
	 * @return The {@link SessionContextSettings} used for this session.
	 */
	getSessionContext(): SessionContextSettings

	/**
	 * Provides the {@link AuthenticationProvider} for the authorization of the {@link Session}´s requests.
	 *
	 * @return {@link AuthenticationProvider} for the authorization of the {@link Session}´s requests.
	 */
	getAuthProvider(): AuthenticationProvider;

	/**
	 * Returns an {@link URL} pointing to the webservice interface of the session.
	 *
	 * @param subPath The location of the webservice interface on the webPDF server.
	 * @param parameters Additional {@link URLSearchParams} parameters.
	 * @return an {@link URL} pointing to the webservice interface of the session.
	 * @throws ResultException a {@link ResultException}
	 */
	getURL(subPath: string, parameters?: URLSearchParams): URL;

	/**
	 * Close the {@link Session}.
	 *
	 * @throws ResultException Shall be thrown, if closing the {@link Session} failed.
	 */
	close(): Promise<void>;
}