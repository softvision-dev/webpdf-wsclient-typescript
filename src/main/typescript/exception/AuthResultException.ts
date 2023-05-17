import {WsclientErrors} from "./WsclientError";
import {ResultException} from "./ResultException";

/**
 * <p>
 * An instance of {@link AuthResultException} indicates some error during the execution of a used
 * {@link AuthProvider}.<br>
 * The actual {@link Error} can be requested by calling {@link cause}.
 * </p>
 */
export class AuthResultException extends ResultException {
	/**
	 * Creates a new {@link AuthResultException}, by wrapping the given {@link Error} as it´s cause.
	 * <p>
	 *
	 * @param cause The actual {@link Error}, that caused the {@link AuthResultException}.
	 */
	public constructor(cause?: Error) {
		super(
			WsclientErrors.AUTH_ERROR,
			WsclientErrors.AUTH_ERROR.getCode(),
			typeof cause !== "undefined" ? cause.message : undefined,
			undefined,
			cause
		);
	}
}