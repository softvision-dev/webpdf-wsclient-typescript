import {ResultException} from "./ResultException";
import {WsclientError, WsclientErrors} from "./WsclientError";

/**
 * <p>
 * An instance of {@link ServerResultException} indicates, that some fail state occurred webPDF server while executing
 * your request. The numerical error code provided by {@link #getErrorCode()} is identical to the
 * <a href="https://docs.webpdf.de/docs/appendix/error-codes">webPDF error codes</a>.
 * </p>
 */
export class ServerResultException extends ResultException {
	/**
	 * Instantiates a new {@link ServerResultException} that wraps a webPDF server fail state.
	 *
	 * @param wsClientError The wsclient specific {@link WsclientError}.
	 * @param errorMessage  The message of the webPDF server fail state.
	 * @param errorCode     The <a href="https://portal.webpdf.de/webPDF/help/doc/en/appendix/error_codes.html">webPDF
	 *                      server error code</a>
	 *                      wrapped by the {@link ServerResultException}.
	 * @param stackTrace    The stacktrace of the webPDF server fail state, as a {@link String}.
	 */
	constructor(wsClientError: WsclientError, errorMessage?: string, errorCode?: number, stackTrace?: string) {
		super(
			wsClientError, typeof errorCode != "undefined" ? errorCode : 0, errorMessage, stackTrace
		);
	}

	/**
	 * Creates a new {@link ServerResultException} that wraps a webPDF server fail state.
	 *
	 * @param errorMessage The message of the webPDF server fail state.
	 * @param errorCode    The <a href="https://portal.webpdf.de/webPDF/help/doc/en/appendix/error_codes.html">webPDF
	 *                     server error code</a>
	 *                     wrapped by the {@link ServerResultException}.
	 * @param stackTrace   The stacktrace of the webPDF server fail state, as a {@link String}.
	 */
	public static createWebserviceException(errorMessage?: string, errorCode?: number, stackTrace?: string): ServerResultException {
		return new ServerResultException(
			WsclientErrors.REST_EXECUTION,
			typeof errorMessage !== "undefined" ? errorMessage : "",
			typeof errorCode !== "undefined" ? errorCode : 0,
			stackTrace
		);
	}

	/**
	 * Returns a {@link String} representation of this {@link ServerResultException}.
	 *
	 * @return A {@link String} representation of this {@link ServerResultException}.
	 */
	public toString(): string {
		return "Server error: " + this.message +
			" (" + this.getErrorCode() + ")\n" +
			(
				typeof this.getStackTraceMessage() !== "undefined" && this.getStackTraceMessage()!.length > 0 ?
					"Server stack trace: " + this.getStackTraceMessage() + "\n" : ""
			);
	}
}
