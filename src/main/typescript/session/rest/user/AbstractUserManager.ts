import {RestSession} from "../RestSession";
import {RestDocument} from "../documents";
import {UserManager} from "./UserManager";
import {KeyStorePassword, UserCertificates, UserCredentials} from "../../../generated-sources";
import {HttpMethod, HttpRestRequest} from "../../connection";
import {DataFormats} from "../../DataFormat";
import {ClientResultException, WsclientErrors} from "../../../exception";

/**
 * Implements {@link UserManager} by delegating all operations to the webPDF server
 * via {@link HttpRestRequest}.
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} used by the currently active {@link RestSession}.
 */
export abstract class AbstractUserManager<T_REST_DOCUMENT extends RestDocument>
	implements UserManager<T_REST_DOCUMENT> {
	private static readonly INFO_PATH: string = "authentication/user/info/";
	private static readonly CERTIFICATES_PATH: string = "authentication/user/certificates/";
	private static readonly CERTIFICATE_PASSWORDS_PATH: string = "authentication/user/certificates/passwords/";

	private readonly session: RestSession<T_REST_DOCUMENT>;

	/**
	 * Initializes a {@link UserManager} for the given {@link RestSession}.
	 *
	 * @param session The {@link RestSession} a {@link UserManager} shall be created for.
	 */
	public constructor(session: RestSession<T_REST_DOCUMENT>) {
		this.session = session;
	}

	/**
	 * Returns the {@link RestSession} used by this {@link UserManager}.
	 *
	 * @return The {@link RestSession} used by this {@link UserManager}.
	 */
	public getSession(): RestSession<T_REST_DOCUMENT> {
		return this.session;
	}

	/**
	 * Fetches the current user information live from the server.
	 * <p>
	 * Unlike {@link RestSession#getUser}, which returns a snapshot from session creation time,
	 * this method always performs a server request and reflects the current server state.
	 * </p>
	 *
	 * @return The current {@link UserCredentials} of the logged-in user.
	 * @throws ResultException Shall be thrown, if the request failed.
	 * @see RestSession#getUser
	 */
	public async fetchUserInfo(): Promise<UserCredentials> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL(AbstractUserManager.INFO_PATH));

		let user: any = await request.executeRequest();
		if (typeof user === "undefined" || user === null) {
			throw new ClientResultException(WsclientErrors.HTTP_EMPTY_ENTITY);
		}

		return UserCredentials.fromJson(user);
	}

	/**
	 * Reads the current certificate state of the logged-in user live from the server.
	 * <p>
	 * Unlike {@link RestSession#getCertificates}, which returns a snapshot from session
	 * creation time, this method always performs a server request.
	 * </p>
	 *
	 * @return The current {@link UserCertificates} of the logged-in user.
	 * @throws ResultException Shall be thrown, if the request failed.
	 * @see RestSession#getCertificates
	 */
	public async readCertificates(): Promise<UserCertificates> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL(AbstractUserManager.CERTIFICATES_PATH));

		let certificates: any = await request.executeRequest();
		if (typeof certificates === "undefined" || certificates === null) {
			throw new ClientResultException(WsclientErrors.HTTP_EMPTY_ENTITY);
		}

		return UserCertificates.fromJson(certificates);
	}

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
	public async updateCertificatePasswords(
		keystoreName: string, keyStorePassword: KeyStorePassword
	): Promise<UserCertificates> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.PUT,
				this.session.getURL(AbstractUserManager.CERTIFICATE_PASSWORDS_PATH + keystoreName),
				JSON.stringify(keyStorePassword.toJson()),
				DataFormats.JSON.getMimeType()
			);

		let certificates: any = await request.executeRequest();
		if (typeof certificates === "undefined" || certificates === null) {
			throw new ClientResultException(WsclientErrors.HTTP_EMPTY_ENTITY);
		}

		return UserCertificates.fromJson(certificates);
	}
}
