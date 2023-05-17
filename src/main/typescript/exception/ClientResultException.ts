import {WsclientError} from "./WsclientError";
import {ResultException} from "./ResultException";

/**
 * <p>
 * An instance of {@link ClientResultException} will be encountered in case a wsclient operation failed on the client´s
 * side. It shall describe the failure, by providing a {@link WsclientError} and a message describing the issue.
 * </p>
 * <p>
 * <b>Important:</b> A {@link ClientResultException} is describing failures in an application implementing a wsclient
 * and should never be used to indicate fail states on the side of the webPDF server.<br>
 * {@link ServerResultException} shall be reserved for that purpose.
 * </p>
 *
 * @see WsclientError
 */
export class ClientResultException extends ResultException {
	private messages: Array<string> = [];
	private _httpErrorCode?: number;

	/**
	 * <p>
	 * Creates a new {@link ResultException} wrapping the given wsclient {@link WsclientError} fail state, exit code and
	 * optional {@link Error} cause.
	 * </p>
	 * <p>
	 * <b>Important:</b> A {@link ClientResultException} is describing failures in an application implementing a
	 * wsclient and should never be used to indicate fail states on the side of the webPDF server.<br>
	 * {@link ServerResultException} shall be reserved for that purpose.
	 * </p>
	 *
	 * @param error The wsclient {@link WsclientError} fail state to wrap.
	 * @param cause The {@link Error} that caused this failure.
	 */
	public constructor(error: WsclientError, cause?: Error) {
		super(error, error.getCode(), error.getMessage(), undefined, cause);
	}

	/**
	 * Returns the additional http error code of this {@link ResultException}.
	 *
	 * @return The http error code of this {@link ResultException}.
	 */
	public getHttpErrorCode(): number | undefined {
		return this._httpErrorCode;
	}

	/**
	 * Sets an additional http error code for this {@link ResultException}.
	 *
	 * @return {@link ResultException} itself.
	 */
	public setHttpErrorCode(value: number): ClientResultException {
		this._httpErrorCode = value;

		return this;
	}


	/**
	 * Returns the detail message string of this exception.
	 *
	 * @return the detail message string of this instance
	 * (which may be null).
	 */
	public getMessage(): string {
		let errorMessage: string = this.getClientError().getMessage();

		if (this.messages.length > 0 && errorMessage.length > 0) {
			errorMessage += "\n";
		}

		errorMessage += this.messages.join("\n");

		return errorMessage;
	}

	/**
	 * Appends the given text to the end of the message describing this {@link ResultException}.
	 *
	 * @param message The text to append to the end of the message describing this {@link ResultException}.
	 * @return The {@link ResultException} instance itself.
	 */
	public appendMessage(message?: string): ClientResultException {
		if (typeof message !== "undefined" && message.length > 0) {
			this.messages.push(message.charAt(0).toUpperCase() + message.slice(1));
		}

		return this;
	}

	/**
	 * Returns true, if this {@link ResultException} is representing the same failure state, as the given
	 * {@link Error}. (false otherwise.)
	 *
	 * @param error The {@link Error} to compare this {@link ResultException with.}
	 * @return true, if this {@link ResultException} is representing the same failure state, as the given
	 * {@link Error}. (false otherwise.)
	 */
	equalsError(error: WsclientError): boolean {
		return this.getClientError().equals(error);
	}

	/**
	 * Returns a {@link string} representation of this {@link ClientResultException}.
	 *
	 * @return A {@link string} representation of this {@link ClientResultException}.
	 */
	public toString(): string {
		return this.getMessage();
	}
}