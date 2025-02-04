import {RestWebService} from "./RestWebService";
import {RestDocument, RestSession} from "../../session";
import {WebServiceTypes} from "../WebServiceType";
import {Billing, PdfPassword, Settings, UrlConverter, UrlConverterOperation, UrlConverterOperationInterface} from "../../generated-sources";

/**
 * An instance of {@link UrlConverterWebService} wraps a wsclient connection to the webPDF webservice endpoint
 * {@link WebServiceType#URLCONVERTER}, using {@link WebServiceProtocol#REST} and expecting a
 * {@link RestDocument} as the result.
 *
 * @param <T_REST_DOCUMENT> The expected {@link RestDocument} type for the documents used by the webPDF server.
 */
export class UrlConverterWebService<T_REST_DOCUMENT extends RestDocument>
	extends RestWebService<UrlConverterOperation, UrlConverter, T_REST_DOCUMENT> {
	/**
	 * Creates a {@link UrlConverterWebService} for the given {@link RestSession}.
	 *
	 * @param session The {@link RestSession} a {@link UrlConverterWebService} shall be created for.
	 */
	public constructor(session: RestSession<T_REST_DOCUMENT>) {
		super(session, WebServiceTypes.URLCONVERTER);
	}

	/**
	 * Returns the {@link UrlConverterWebService} specific {@link UrlConverter}, which allows setting parameters
	 * for the webservice execution.
	 *
	 * @return The {@link UrlConverter} operation parameters.
	 */
	public getOperationParameters(): UrlConverter {
		return this.getOperationData().urlconverter;
	}

	/**
	 * Sets the {@link UrlConverterWebService} specific {@link UrlConverter} element, which allows setting
	 * parameters for the webservice execution.
	 *
	 * @param operation Sets the {@link UrlConverter} operation parameters.
	 */
	public setOperationParameters(operation: UrlConverter | undefined): void {
		if (typeof operation === "undefined") {
			return;
		}

		this.getOperationData().urlconverter = operation;
	}

	/**
	 * Returns the {@link PdfPassword} of the current webservice.
	 *
	 * @return the {@link PdfPassword} of the current webservice.
	 */
	public getPassword(): PdfPassword | undefined {
		return this.getOperationData().password;
	}

	/**
	 * Sets the {@link PdfPassword} of the current webservice.
	 *
	 * @param password The {@link PdfPassword} of the current webservice.
	 */
	public setPassword(password: PdfPassword | undefined): void {
		this.getOperationData().password = password;
	}

	/**
	 * Returns the {@link Billing} of the current webservice.
	 *
	 * @return the {@link Billing} of the current webservice.
	 */
	public getBilling(): Billing | undefined {
		return this.getOperationData().billing;
	}

	/**
	 * Sets the {@link Billing} of the current webservice.
	 *
	 * @param billing The {@link Billing} of the current webservice.
	 */
	public setBilling(billing: Billing | undefined): void {
		this.getOperationData().billing = billing;
	}

	/**
	 * Returns the {@link Settings} of the current webservice.
	 *
	 * @return the {@link Settings} of the current webservice.
	 */
	public getSettings(): Settings | undefined {
		return this.getOperationData().settings;
	}

	/**
	 * Returns the {@link Settings} of the current webservice.
	 *
	 * @return the {@link Settings} of the current webservice.
	 */
	public setSettings(settings: Settings | undefined): void {
		this.getOperationData().settings = settings;
	}

	/**
	 * Initializes and prepares the execution of this {@link UrlConverterWebService}.
	 *
	 * @return The prepared {@link UrlConverterOperation}.
	 */
	protected initOperation(): UrlConverterOperation {
		return UrlConverterOperation.fromJson({
			urlconverter: UrlConverter.fromJson({}).toJson()
		} as UrlConverterOperationInterface);
	}
}