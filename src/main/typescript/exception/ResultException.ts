import {WsclientError} from "./WsclientError";

/**
 * <p>
 * An instance of {@link ResultException} will be encountered in case a wsclient operation failed for some reason.<br>
 * A {@link ResultException} mostly serves as the common, generic, catchable base type for more specific exceptions that
 * provide more detailed information about the failure.
 * </p>
 */
export class ResultException extends Error {
	private wsclientError: WsclientError;
	private _errorCode: number;
	private _stackTraceMessage?: string;
	private _cause?: Error;

	/**
	 * <p>
	 * Constructs a new {@link ResultException} with the given information.<br>
	 * Note that the detail message associated with cause is <i>not</i> automatically incorporated in this
	 * exception's detail message.
	 * </p>
	 *
	 * @param wsClientError     The wsclient specific {@link WsclientError}.
	 * @param errorCode         The numeric error code.
	 * @param errorMessage      The detail message (which is saved for later retrieval by the {@link #getMessage()} method).
	 * @param stackTraceMessage The (optional) stacktrace message.
	 * @param cause             The cause (which is saved for later retrieval by the {@link #getCause()} method).  (A undefined
	 *                          value is permitted, and indicates that the cause is nonexistent or unknown.)
	 */
	constructor(
		wsClientError: WsclientError, errorCode: number, errorMessage?: string, stackTraceMessage?: string, cause?: Error
	) {
		super(errorMessage);
		this.wsclientError = wsClientError;
		this._errorCode = errorCode;
		this._stackTraceMessage = stackTraceMessage;
		this._cause = cause;
	}

	/**
	 * Returns the wsclient {@link WsclientError} of this {@link ResultException}.
	 *
	 * @return The wsclient {@link WsclientError} of this {@link ResultException}.
	 */
	public getClientError(): WsclientError {
		return this.wsclientError;
	}

	/**
	 * <p>
	 * Returns the error code of this {@link ResultException}.<br>
	 * For {@link ServerResultException}s this is the actual
	 * <a href="https://portal.webpdf.de/webPDF/help/doc/en/appendix/error_codes.html">webPDF server error code</a>,
	 * other {@link ResultException}s shall return the numerical representation of the wsclient {@link Error}.<br>
	 * </p>
	 *
	 * @return The error code of this {@link ResultException}.
	 */
	public getErrorCode(): number {
		return this._errorCode;
	}

	/**
	 * Returns the message describing this {@link ResultException}.
	 *
	 * @return The message describing this {@link ResultException}.
	 */
	public getMessage(): string {
		return this.message;
	}

	/**
	 * <p>
	 * Returns the stacktrace message of this {@link ResultException}.<br>
	 * For most {@link ResultException}s this will return undefined - {@link ServerResultException}s shall return the
	 * {@link String} representation of the stacktrace, that lead to the error on the webPDF server´s side.
	 * </p>
	 *
	 * @return The stacktrace message of this {@link ResultException}.
	 */
	public getStackTraceMessage(): string | undefined {
		return this._stackTraceMessage;
	}

	public getCause(): Error | undefined {
		return this._cause;
	}
}
