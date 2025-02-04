import {RestWebService} from "./RestWebService";
import {RestDocument, RestSession} from "../../session";
import {WebServiceTypes} from "../WebServiceType";
import {BaseToolbox, Billing, PdfPassword, Settings, ToolboxOperation, ToolboxOperationInterface} from "../../generated-sources";

/**
 * An instance of {@link ToolboxWebService} wraps a wsclient connection to the webPDF webservice endpoint
 * {@link WebServiceType#TOOLBOX}, using {@link WebServiceProtocol#REST} and expecting a {@link RestDocument}
 * as the result.
 *
 * @param <T_REST_DOCUMENT> The expected {@link RestDocument} type for the documents used by the webPDF server.
 */
export class ToolboxWebService<T_REST_DOCUMENT extends RestDocument>
	extends RestWebService<ToolboxOperation, Array<BaseToolbox>, T_REST_DOCUMENT> {
	/**
	 * Creates a {@link ToolboxWebService} for the given {@link RestSession}
	 *
	 * @param session The {@link RestSession} a {@link ToolboxWebService} shall be created for.
	 */
	public constructor(session: RestSession<T_REST_DOCUMENT>) {
		super(session, WebServiceTypes.TOOLBOX);
	}

	/**
	 * Returns the {@link ToolboxWebService} specific {@link Toolbox}, which allows setting parameters
	 * for the webservice execution.
	 *
	 * @return The {@link Toolbox} operation parameters.
	 */
	public getOperationParameters(): Array<BaseToolbox> {
		if (typeof this.getOperationData().toolbox === "undefined") {
			this.getOperationData().toolbox = [];
		}

		return this.getOperationData().toolbox!;
	}

	/**
	 * Sets the {@link ToolboxWebService} specific {@link Toolbox} element, which allows setting
	 * parameters for the webservice execution.
	 *
	 * @param operation Sets the {@link Toolbox} operation parameters.
	 */
	public setOperationParameters(operation: Array<BaseToolbox> | undefined): void {
		if (typeof operation === "undefined" || operation.length === 0) {
			return;
		}

		this.getOperationData().toolbox = operation;
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
	 * Initializes and prepares the execution of this {@link ToolboxWebService}.
	 *
	 * @return The prepared {@link ToolboxOperation}.
	 */
	protected initOperation(): ToolboxOperation {
		return ToolboxOperation.fromJson({
			Toolbox: []
		} as ToolboxOperationInterface);
	}
}