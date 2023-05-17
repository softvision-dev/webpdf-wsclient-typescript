import {Document, Session} from "../session";
import {WebService} from "./WebService";
import {WebServiceType} from "./WebServiceType";
import {Parameter} from "../generated-sources";

/**
 * An instance of {@link AbstractWebService} wraps a wsclient connection to a specific webPDF webservice endpoint
 * ({@link WebServiceType}), using a specific {@link WebServiceProtocol} and expecting a specific {@link Document} type
 * as the result.
 *
 * @param <T_SESSION>             The expected {@link Session} type for the webservice connection.
 * @param <T_OPERATION_DATA>      The operation type of the targeted webservice endpoint.
 * @param <T_OPERATION_PARAMETER> The parameter type of the targeted webservice endpoint.
 * @param <T_DOCUMENT>            The expected {@link Document} type for the results produced by the webPDF server.
 * @param <T_BILLING>             The operation´s billing type configuring the server´s billing log entries.
 * @param <T_PASSWORD>            The operation´s password type, used to configure material for password-protected
 *                                documents.
 * @param <T_SETTINGS>            The operation´s additional settings type, used to configure webservice independent
 *                                options and parameters.
 */
export abstract class AbstractWebService<T_SESSION extends Session, T_OPERATION_DATA extends Parameter,
	T_OPERATION_PARAMETER, T_DOCUMENT extends Document, T_BILLING, T_PASSWORD, T_SETTINGS>
	implements WebService<T_SESSION, T_OPERATION_PARAMETER, T_DOCUMENT, T_BILLING, T_PASSWORD, T_SETTINGS> {
	private readonly webServiceType: WebServiceType;
	private readonly headers: Headers;
	private readonly session: T_SESSION;
	private readonly operationData: T_OPERATION_DATA;
	private readonly additionalParameter: URLSearchParams;

	/**
	 * Creates a webservice interface of the given {@link WebServiceType} for the given {@link T_SESSION}.
	 *
	 * @template T_SESSION
	 * @param webServiceType The {@link WebServiceType} interface, that shall be created.
	 * @param session        The {@link T_SESSION} the webservice interface shall be created for.
	 */
	public constructor(webServiceType: WebServiceType, session: T_SESSION) {
		this.session = session;
		this.webServiceType = webServiceType;
		this.headers = new Headers();
		this.operationData = this.initOperation();
		this.additionalParameter = new URLSearchParams();
	}

	/**
	 * Returns the {@link T_SESSION} of the current webservice.
	 *
	 * @template T_SESSION
	 * @return The {@link T_SESSION} of the current webservice.
	 */
	public getSession(): T_SESSION {
		return this.session;
	}

	/**
	 * Returns the {@link T_OPERATION_DATA} of the current webservice.
	 *
	 * @template T_OPERATION_DATA
	 * @return The {@link T_OPERATION_DATA} of the current webservice.
	 */
	protected getOperationData(): T_OPERATION_DATA {
		return this.operationData;
	}

	/**
	 * Returns the {@link WebServiceType} of the current webservice.
	 *
	 * @return The {@link WebServiceType} of the current webservice.
	 */
	protected getWebServiceType(): WebServiceType {
		return this.webServiceType;
	}

	/**
	 * Returns the {@link Headers} of the current webservice operation.
	 *
	 * @return The {@link Headers} of the current webservice operation.
	 */
	protected getHeaders(): Headers {
		return this.headers;
	}

	/**
	 * Initialize all substructures, that must be set for this webservice to accept parameters for this
	 * webservice type.
	 */
	protected abstract initOperation(): T_OPERATION_DATA;

	/**
	 * Returns additional {@link URLSearchParams} for this webservice call.
	 *
	 * @return additional {@link URLSearchParams} for this webservice call.
	 */
	public getAdditionalParameter(): URLSearchParams {
		return this.additionalParameter;
	}

	/**
	 * <p>
	 * Execute the webservice operation or optionally for the given source {@link T_DOCUMENT} and return the
	 * resulting {@link T_DOCUMENT}.
	 * </p>
	 *
	 * @template T_DOCUMENT
	 * @param sourceDocument The source {@link T_DOCUMENT}, that shall be processed.
	 * @return The resulting {@link T_DOCUMENT}.
	 * @throws ResultException Shall be thrown, upon an execution failure.
	 */
	public abstract process(sourceDocument?: T_DOCUMENT): Promise<T_DOCUMENT | undefined>;

	/**
	 * Returns the {@link T_PASSWORD} of the current webservice.
	 *
	 * @template T_PASSWORD
	 * @return the {@link T_PASSWORD} of the current webservice.
	 */
	public abstract getPassword(): T_PASSWORD | undefined;

	/**
	 * Sets the {@link T_PASSWORD} of the current webservice.
	 *
	 * @template T_PASSWORD
	 * @param password The {@link T_PASSWORD} of the current webservice.
	 */
	public abstract setPassword(password: T_PASSWORD | undefined): void;

	/**
	 * Returns the {@link T_BILLING} of the current webservice.
	 *
	 * @template T_BILLING
	 * @return the {@link T_BILLING} of the current webservice.
	 */
	public abstract getBilling(): T_BILLING | undefined;

	/**
	 * Sets the {@link T_BILLING} of the current webservice.
	 *
	 * @template T_BILLING
	 * @param billing The {@link T_BILLING} of the current webservice.
	 */
	public abstract setBilling(billing: T_BILLING | undefined): void;

	/**
	 * Returns the {@link T_SETTINGS} of the current webservice.
	 *
	 * @template T_SETTINGS
	 * @return the {@link T_SETTINGS} of the current webservice.
	 */
	public abstract getSettings(): T_SETTINGS | undefined;

	/**
	 * Returns the {@link T_SETTINGS} of the current webservice.
	 *
	 * @template T_SETTINGS
	 * @return the {@link T_SETTINGS} of the current webservice.
	 */
	public abstract setSettings(settings: T_SETTINGS | undefined): void;

	/**
	 * Returns the webservice specific {@link T_OPERATION_PARAMETER}, which allows setting parameters for
	 * the webservice execution.
	 *
	 * @template T_OPERATION_PARAMETER
	 * @return The webservice specific {@link T_OPERATION_PARAMETER}.
	 */
	public abstract getOperationParameters(): T_OPERATION_PARAMETER;

	/**
	 * Sets the webservice specific {@link T_OPERATION_PARAMETER}, which allows setting parameters for
	 * the webservice execution.
	 *
	 * @template T_OPERATION_PARAMETER
	 * @param operation The webservice specific {@link T_OPERATION_PARAMETER}.
	 */
	public abstract setOperationParameters(operation: T_OPERATION_PARAMETER | undefined): void;
}