import {RestWebService} from "./RestWebService";
import {RestDocument, RestSession} from "../../session";
import {WebServiceTypes} from "../WebServiceType";
import {Billing, PdfPassword, Settings, Signature, SignatureOperation, SignatureOperationInterface} from "../../generated-sources";

/**
 * An instance of {@link SignatureWebService} wraps a wsclient connection to the webPDF webservice endpoint
 * {@link WebServiceType#SIGNATURE}, using {@link WebServiceProtocol#REST} and expecting a {@link RestDocument}
 * as the result.
 *
 * @param <T_REST_DOCUMENT> The expected {@link RestDocument} type for the documents used by the webPDF server.
 */
export class SignatureWebService<T_REST_DOCUMENT extends RestDocument>
	extends RestWebService<SignatureOperation, Signature, T_REST_DOCUMENT> {
	/**
	 * Creates a {@link SignatureWebService} for the given {@link RestSession}
	 *
	 * @param session The {@link RestSession} a {@link SignatureWebService} shall be created for.
	 */
	public constructor(session: RestSession<T_REST_DOCUMENT>) {
		super(session, WebServiceTypes.SIGNATURE);
	}

	/**
	 * Returns the {@link SignatureWebService} specific {@link Signature}, which allows setting parameters
	 * for the webservice execution.
	 *
	 * @return The {@link Signature} operation parameters.
	 */
	public getOperationParameters(): Signature {
		return this.getOperationData().signature;
	}

	/**
	 * Sets the {@link SignatureWebService} specific {@link Signature} element, which allows setting
	 * parameters for the webservice execution.
	 *
	 * @param operation Sets the {@link Signature} operation parameters.
	 */
	public setOperationParameters(operation: Signature | undefined) {
		if (typeof operation === "undefined") {
			return;
		}

		this.getOperationData().signature = operation;
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
	 * Initializes and prepares the execution of this {@link SignatureWebService}.
	 *
	 * @return The prepared {@link SignatureOperation}.
	 */
	protected initOperation(): SignatureOperation {
		return SignatureOperation.fromJson({
			signature: Signature.fromJson({}).toJson()
		} as SignatureOperationInterface);
	}
}