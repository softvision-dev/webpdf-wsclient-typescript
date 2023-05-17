import {Document, Session} from "../session";

/**
 * A class implementing {@link WebService} wraps a wsclient connection to a specific webPDF webservice endpoint
 * ({@link WebServiceType}), using a specific {@link WebServiceProtocol} and expecting a specific {@link Document} type
 * as the result.
 *
 * @param <T_SESSION>             The expected {@link Session} type for the webservice connection.
 * @param <T_OPERATION_PARAMETER> The parameter type of the targeted webservice endpoint.
 * @param <T_DOCUMENT>            The expected {@link Document} type for the results produced by the webPDF server.
 * @param <T_BILLING>             The operation´s billing type configuring the server´s billing log entries.
 * @param <T_PASSWORD>            The operation´s password type, used to configure material for password-protected
 *                                documents.
 * @param <T_SETTINGS>            The operation´s additional settings type, used to configure webservice independent
 *                                options and parameters.
 */
export interface WebService<T_SESSION extends Session, T_OPERATION_PARAMETER, T_DOCUMENT extends Document,
	T_BILLING, T_PASSWORD, T_SETTINGS> {
	/**
	 * Returns the {@link T_SESSION} of the current webservice.
	 *
	 * @template T_SESSION
	 * @return The {@link T_SESSION} of the current webservice.
	 */
	getSession(): T_SESSION;

	/**
	 * <p>
	 * Execute the webservice operation and return the resulting {@link T_DOCUMENT}.
	 * </p>
	 * <p>
	 * <b>Be aware:</b> Most webservices require a source {@link T_DOCUMENT}, with few exceptions, such as the
	 * URL-converter webservice. Before using this method, make sure that this is valid for
	 * the {@link WebService} call you intend to hereby execute.
	 * </p>
	 *
	 * @template T_DOCUMENT
	 * @param sourceDocument The optional source {@link T_DOCUMENT}, that shall be processed.
	 * @return The resulting {@link T_DOCUMENT}.
	 * @throws ResultException Shall be thrown, upon an execution failure.
	 */
	process(sourceDocument?: T_DOCUMENT): Promise<T_DOCUMENT | undefined>;

	/**
	 * Returns the webservice specific {@link T_OPERATION_PARAMETER}, which allows setting parameters for
	 * the webservice execution.
	 *
	 * @template T_OPERATION_PARAMETER
	 * @return The webservice specific {@link T_OPERATION_PARAMETER}.
	 */
	getOperationParameters(): T_OPERATION_PARAMETER;

	/**
	 * Sets the webservice specific {@link T_OPERATION_PARAMETER}, which allows setting parameters for
	 * the webservice execution.
	 *
	 * @template T_OPERATION_PARAMETER
	 * @param operation The webservice specific {@link T_OPERATION_PARAMETER}.
	 */
	setOperationParameters(operation: T_OPERATION_PARAMETER | undefined): void;

	/**
	 * Returns the {@link T_PASSWORD} of the current webservice.
	 *
	 * @template T_PASSWORD
	 * @return the {@link T_PASSWORD} of the current webservice.
	 */
	getPassword(): T_PASSWORD | undefined;

	/**
	 * Sets the {@link T_PASSWORD} for the current webservice.
	 *
	 * @template T_PASSWORD
	 * @param password The {@link T_PASSWORD} for the current webservice.
	 */
	setPassword(password: T_PASSWORD | undefined): void;

	/**
	 * Returns the {@link T_BILLING} of the current webservice.
	 *
	 * @template T_BILLING
	 * @return the {@link T_BILLING} of the current webservice.
	 */
	getBilling(): T_BILLING | undefined;

	/**
	 * Sets the {@link T_BILLING} for the current webservice.
	 *
	 * @template T_BILLING
	 * @param billing The {@link T_BILLING} for the current webservice.
	 */
	setBilling(billing: T_BILLING | undefined): void;

	/**
	 * Returns the {@link T_SETTINGS} of the current webservice.
	 *
	 * @template T_SETTINGS
	 * @return the {@link T_SETTINGS} of the current webservice.
	 */
	getSettings(): T_SETTINGS | undefined;

	/**
	 * Sets the {@link T_SETTINGS} for the current webservice.
	 *
	 * @template T_SETTINGS
	 * @param settings The {@link T_SETTINGS} for the current webservice.
	 */
	setSettings(settings: T_SETTINGS | undefined): void;

	/**
	 * Returns additional {@link URLSearchParams} for this webservice call.
	 *
	 * @return additional {@link URLSearchParams} for this webservice call.
	 */
	getAdditionalParameter(): URLSearchParams;
}