import {RestSession} from "../RestSession";
import {RestDocument} from "../documents";
import {KeyStorePassword, UserCertificates, UserCredentials} from "../../../generated-sources";

/**
 * A class implementing {@link UserManager} provides access to authentication user operations
 * for the currently logged-in user of a {@link RestSession}.
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} used by the currently active {@link RestSession}.
 */
export interface UserManager<T_REST_DOCUMENT extends RestDocument> {
	/**
	 * Returns the {@link RestSession} used by this {@link UserManager}.
	 *
	 * @return The {@link RestSession} used by this {@link UserManager}.
	 */
	getSession(): RestSession<T_REST_DOCUMENT>;

	/**
	 * Fetches the current user information live from the server.
	 * <p>
	 * Unlike {@link RestSession#getUser}, which returns a snapshot from session creation time,
	 * this method always performs a server request and reflects the current server state —
	 * for example after permission changes that occurred during the active session.
	 * </p>
	 *
	 * @return The current {@link UserCredentials} of the logged-in user.
	 * @throws ResultException Shall be thrown, if the request failed.
	 * @see RestSession#getUser
	 */
	fetchUserInfo(): Promise<UserCredentials>;

	/**
	 * Reads the current certificate state of the logged-in user live from the server.
	 * <p>
	 * Unlike {@link RestSession#getCertificates}, which returns a snapshot from session
	 * creation time, this method always performs a server request and reflects the current
	 * certificate state without modifying any passwords.
	 * </p>
	 *
	 * @return The current {@link UserCertificates} of the logged-in user.
	 * @throws ResultException Shall be thrown, if the request failed.
	 * @see RestSession#getCertificates
	 */
	readCertificates(): Promise<UserCertificates>;

	/**
	 * Updates the passwords for a specific keystore of the currently logged-in user and returns
	 * the updated {@link UserCertificates}.
	 * <p>
	 * This method supersedes the deprecated {@link RestSession#updateCertificates}. Note that
	 * unlike the deprecated method, this method does not update the certificate snapshot returned
	 * by {@link RestSession#getCertificates}.
	 * </p>
	 *
	 * @param keystoreName     The name of the keystore whose passwords shall be updated.
	 * @param keyStorePassword The {@link KeyStorePassword} containing the new passwords.
	 * @return The updated {@link UserCertificates} of the currently logged-in user.
	 * @throws ResultException Shall be thrown, if the request failed.
	 * @see RestSession#updateCertificates
	 */
	updateCertificatePasswords(keystoreName: string, keyStorePassword: KeyStorePassword): Promise<UserCertificates>;
}
