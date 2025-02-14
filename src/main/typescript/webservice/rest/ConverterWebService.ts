import {RestWebService} from "./RestWebService";
import {RestDocument, RestSession} from "../../session";
import {WebServiceTypes} from "../WebServiceType";
import {Billing, Converter, ConverterOperation, ConverterOperationInterface, PdfPassword, Settings} from "../../generated-sources";

/**
 * An instance of {@link ConverterWebService} wraps a wsclient connection to the webPDF webservice endpoint
 * {@link WebServiceType#CONVERTER}, using {@link WebServiceProtocol#REST} and expecting a {@link RestDocument}
 * as the result.
 *
 * @param <T_REST_DOCUMENT> The expected {@link RestDocument} type for the documents used by the webPDF server.
 */
export class ConverterWebService<T_REST_DOCUMENT extends RestDocument>
	extends RestWebService<ConverterOperation, Converter, T_REST_DOCUMENT> {
	/**
	 * Creates a {@link ConverterWebService} for the given {@link RestSession}
	 *
	 * @param session The {@link RestSession} a {@link ConverterWebService} shall be created for.
	 */
	public constructor(session: RestSession<T_REST_DOCUMENT>) {
		super(session, WebServiceTypes.CONVERTER);
	}

	/**
	 * Returns the {@link ConverterWebService} specific {@link Converter}, which allows setting parameters
	 * for the webservice execution.
	 *
	 * @return The {@link Converter} operation parameters.
	 */
	public getOperationParameters(): Converter {
		return this.getOperationData().converter;
	}

	/**
	 * Sets the {@link ConverterWebService} specific {@link Converter} element, which allows setting
	 * parameters for the webservice execution.
	 *
	 * @param operation Sets the {@link Converter} operation parameters.
	 */
	public setOperationParameters(operation: Converter | undefined): void {
		if (typeof operation === "undefined") {
			return;
		}

		this.getOperationData().converter = operation;
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
	 * Initializes and prepares the execution of this {@link ConverterWebService}.
	 *
	 * @return The prepared {@link ConverterOperation}.
	 */
	protected initOperation(): ConverterOperation {
		return ConverterOperation.fromJson({
			converter: Converter.fromJson({}).toJson()
		} as ConverterOperationInterface);
	}
}