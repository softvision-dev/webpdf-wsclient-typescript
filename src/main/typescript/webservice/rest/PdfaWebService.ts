import {RestDocument, RestSession} from "../../session";
import {WebServiceTypes} from "../WebServiceType";
import {RestWebService} from "./RestWebService";
import {Billing, Pdfa, PdfaOperation, PdfaOperationInterface, PdfPassword, Settings} from "../../generated-sources";

/**
 * An instance of {@link PdfaWebService} wraps a wsclient connection to the webPDF webservice endpoint
 * {@link WebServiceType#PDFA}, using {@link WebServiceProtocol#REST} and expecting a {@link RestDocument}
 * as the result.
 *
 * @param <T_REST_DOCUMENT> The expected {@link RestDocument} type for the documents used by the webPDF server.
 */
export class PdfaWebService<T_REST_DOCUMENT extends RestDocument>
	extends RestWebService<PdfaOperation, Pdfa, T_REST_DOCUMENT> {
	/**
	 * Creates a {@link PdfaWebService} for the given {@link RestSession}
	 *
	 * @param session The {@link RestSession} a {@link PdfaWebService} shall be created for.
	 */
	public constructor(session: RestSession<T_REST_DOCUMENT>) {
		super(session, WebServiceTypes.PDFA);
	}

	/**
	 * Returns the {@link PdfaWebService} specific {@link Pdfa}, which allows setting parameters
	 * for the webservice execution.
	 *
	 * @return The {@link Pdfa} operation parameters.
	 */
	public getOperationParameters(): Pdfa {
		return this.getOperationData().pdfa;
	}

	/**
	 * Sets the {@link PdfaWebService} specific {@link Pdfa} element, which allows setting
	 * parameters for the webservice execution.
	 *
	 * @param operation Sets the {@link Pdfa} operation parameters.
	 */
	public setOperationParameters(operation: Pdfa | undefined) {
		if (typeof operation === "undefined") {
			return;
		}

		this.getOperationData().pdfa = operation;
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
	 * Initializes and prepares the execution of this {@link PdfaWebService}.
	 *
	 * @return The prepared {@link PdfaOperation}.
	 */
	protected initOperation(): PdfaOperation {
		return PdfaOperation.fromJson({
			pdfa: Pdfa.fromJson({}).toJson()
		} as PdfaOperationInterface);
	}
}