import {RestDocument, RestSession} from "../../session";
import {WebServiceTypes} from "../WebServiceType";
import {RestWebService} from "./RestWebService";
import {Barcode, BarcodeOperation, BarcodeOperationInterface, Billing, PdfPassword, Settings} from "../../generated-sources";

/**
 * An instance of {@link BarcodeWebService} wraps a wsclient connection to the webPDF webservice endpoint
 * {@link WebServiceType#BARCODE}, using {@link WebServiceProtocol#REST} and expecting a {@link RestDocument}
 * as the result.
 *
 * @param <T_REST_DOCUMENT> The expected {@link RestDocument} type for the documents used by the webPDF server.
 */
export class BarcodeWebService<T_REST_DOCUMENT extends RestDocument>
	extends RestWebService<BarcodeOperation, Barcode, T_REST_DOCUMENT> {
	/**
	 * Creates a {@link BarcodeWebService} for the given {@link RestSession}
	 *
	 * @param session The {@link RestSession} a {@link BarcodeWebService} shall be created for.
	 */
	constructor(session: RestSession<T_REST_DOCUMENT>) {
		super(session, WebServiceTypes.BARCODE);
	}

	/**
	 * Returns the {@link BarcodeWebService} specific {@link Barcode}, which allows setting parameters
	 * for the webservice execution.
	 *
	 * @return The {@link Barcode} operation parameters.
	 */
	public getOperationParameters(): Barcode {
		return this.getOperationData().barcode;
	}

	/**
	 * Sets the {@link BarcodeWebService} specific {@link Barcode} element, which allows setting
	 * parameters for the webservice execution.
	 *
	 * @param operation Sets the {@link Barcode} operation parameters.
	 */
	public setOperationParameters(operation: Barcode | undefined): void {
		if (typeof operation === "undefined") {
			return;
		}

		this.getOperationData().barcode = operation;
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
	 * Initialize all substructures, that must be set for this webservice to accept parameters for this
	 * webservice type.
	 */
	protected initOperation(): BarcodeOperation {
		return BarcodeOperation.fromJson({
			barcode: Barcode.fromJson({}).toJson()
		} as BarcodeOperationInterface);
	}
}