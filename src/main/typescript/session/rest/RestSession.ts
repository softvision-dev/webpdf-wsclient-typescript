import {Session} from "../Session";
import {DocumentManager, RestDocument} from "./documents";
import {RestWebService, WebServiceType} from "../../webservice";
import {Axios, AxiosProgressEvent} from "axios";
import {AdministrationManager} from "./administration";
import {KeyStorePassword, UserCertificates, UserCredentials} from "../../generated-sources";

/**
 * <p>
 * A class implementing {@link RestSession} establishes and manages a {@link WebServiceProtocol#REST} connection with
 * a webPDF server.
 * </p>
 * <p>
 * <b>Information:</b> A {@link RestSession} provides simplified access to the uploaded {@link RestDocument}s via
 * a {@link DocumentManager}.
 * </p>
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} type used by this {@link RestSession}
 */
export interface RestSession<T_REST_DOCUMENT extends RestDocument> extends Session {
	/**
	 * Returns the {@link Axios} instance connected to the webPDF server via this {@link RestSession}.
	 *
	 * @return the {@link Axios} instance connected to the webPDF server via this {@link RestSession}.
	 */
	getHttpClient(): Axios;

	/**
	 * Returns the active {@link DocumentManager} of this {@link RestSession}.
	 *
	 * @return The active {@link DocumentManager} of this {@link RestSession}.
	 */
	getDocumentManager(): DocumentManager<T_REST_DOCUMENT>;

	/**
	 * This is a shortcut for {@link DocumentManager#uploadDocument} and uploads the given source
	 * to the webPDF server.
	 *
	 * @template T_REST_DOCUMENT
	 * @param data     The document {@link Blob} to upload.
	 * @param fileName The name of the uploaded document.
	 * @param options  Additional request options - see {@link HttpRestRequest}.
	 * @return The uploaded {@link T_REST_DOCUMENT}.
	 * @throws ResultException Shall be thrown, should the upload have failed.
	 */
	uploadDocument(data: Blob, fileName: string, options: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<T_REST_DOCUMENT>;

	/**
	 * Returns the active {@link AdministrationManager} of this {@link RestSession}.
	 *
	 * @return The active {@link AdministrationManager} of this {@link RestSession}.
	 */
	getAdministrationManager(): AdministrationManager<T_REST_DOCUMENT>;

	/**
	 * Returns the {@link UserCredentials} logged in via this {@link RestSession}.
	 *
	 * @return The {@link UserCredentials} logged in via this {@link RestSession}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getUser(): Promise<UserCredentials>

	/**
	 * Returns the {@link UserCertificates} logged in via this {@link RestSession}.
	 *
	 * @return The {@link UserCertificates} of the logged in user in this {@link RestSession}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getCertificates(): Promise<UserCertificates>

	/**
	 * Updates the {@link KeyStorePassword}s for specific keystore and returns the
	 * {@link UserCertificates} for the currently logged in user afterwards.
	 *
	 * @param keystoreName 	   The name of the keystore to be updated.
	 * @param keyStorePassword The {@link KeyStorePassword} to unlock the certificates with.
	 * @return The {@link UserCertificates} of the logged in user in this {@link RestSession}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	updateCertificates(keystoreName: string, keyStorePassword: KeyStorePassword): Promise<UserCertificates | undefined>;

	/**
	 * Creates a matching {@link RestWebService} instance to execute a webPDF operation for the current session.
	 *
	 * @template T_WEBSERVICE
	 * @param {T_WEBSERVICE} The {@link WebServiceType} to create an interface for.
	 * @param webServiceType The {@link WebServiceType} to create an interface for.
	 * @return A matching {@link RestWebService} instance.
	 * @throws ResultException Shall be thrown, if the {@link RestWebService} creation failed.
	 */
	 createWebServiceInstance<T_WEBSERVICE extends RestWebService<any, any, any>>(webServiceType: WebServiceType): T_WEBSERVICE;
}

export function instanceOfRestSession(object: any): boolean {
	return 'getHttpClient' in object &&
		'getDocumentManager' in object &&
		'uploadDocument' in object &&
		'getAdministrationManager' in object &&
		'getUser' in object &&
		'getCertificates' in object &&
		'updateCertificates' in object &&
		'createWebServiceInstance' in object;
}