import {AbstractSession} from "../AbstractSession";
import {RestSession} from "./RestSession";
import {RestWebService, WebServiceProtocol, WebServiceType} from "../../webservice";
import {KeyStorePassword, UserCertificates, UserCredentials} from "../../generated-sources";
import axios, {AxiosInstance, AxiosRequestConfig} from "axios";
import {HttpMethod, HttpRestRequest, SessionContext} from "../connection";
import {AuthenticationProvider} from "../auth";
import {DocumentManager, RestDocument} from "./documents";
import {AdministrationManager} from "./administration";
import {DataFormats} from "../DataFormat";
import {wsclientConfiguration} from "../../configuration";

/**
 * <p>
 * An instance of {@link AbstractRestSession} establishes and manages a {@link WebServiceProtocol#REST} connection
 * with a webPDF server.
 * </p>
 * <p>
 * <b>Information:</b> A {@link RestSession} provides simplified access to the uploaded {@link RestDocument}s via
 * a {@link DocumentManager}.
 * </p>
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} type used by this {@link RestSession}.
 */
export abstract class AbstractRestSession<T_REST_DOCUMENT extends RestDocument> extends AbstractSession
	implements RestSession<T_REST_DOCUMENT> {
	private static readonly INFO_PATH: string = "authentication/user/info/";
	private static readonly LOGOUT_PATH: string = "authentication/user/logout/";
	private static readonly CERTIFICATES_PATH: string = "authentication/user/certificates/";
	private readonly _httpClient: AxiosInstance;
	protected user?: UserCredentials;
	protected certificates?: UserCertificates;
	protected readonly documentManager: DocumentManager<T_REST_DOCUMENT>;
	protected administrationManager: AdministrationManager<T_REST_DOCUMENT>;

	/**
	 * <p>
	 * Creates a new {@link AbstractRestSession} instance providing connection information, authorization objects and
	 * a {@link DocumentManager} for a webPDF server-client {@link RestSession}.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> Neither {@link SessionContext}, nor {@link AuthenticationProvider} are required to serve multiple
	 * {@link Session}s at a time. It is expected to create a new {@link SessionContext} and {@link AuthenticationProvider}
	 * per {@link Session} you create.
	 * </p>
	 *
	 * @param serverContext The {@link SessionContext} initializing the {@link SessionContextSettings} of this
	 *                      {@link RestSession}.
	 * @param authProvider  The {@link AuthenticationProvider} for authentication/authorization of this {@link RestSession}.
	 * @throws ResultException Shall be thrown, in case establishing the {@link RestSession} failed.
	 */
	public constructor(serverContext: SessionContext, authProvider: AuthenticationProvider) {
		super(WebServiceProtocol.REST, serverContext, authProvider);

		let clientConfig: AxiosRequestConfig = {
			env: {
				FormData: wsclientConfiguration.FormData
			}
		};

		if (typeof serverContext.getProxy() !== "undefined") {
			clientConfig.proxy = serverContext.getProxy();
		}

		if (typeof serverContext.getTlsContext() !== "undefined") {
			clientConfig.httpsAgent = serverContext.getTlsContext()
		}

		this._httpClient = axios.create(clientConfig);
		this.documentManager = this.createDocumentManager();
		this.administrationManager = this.createAdministrationManager();
	}

	/**
	 * Returns the {@link AxiosInstance} connected to the webPDF server via this {@link RestSession}.
	 *
	 * @return The {@link AxiosInstance} connected to the webPDF server via this {@link RestSession}.
	 */
	public getHttpClient(): AxiosInstance {
		return this._httpClient;
	}

	/**
	 * Returns the active {@link DocumentManager} of this {@link RestSession}.
	 *
	 * @return The active {@link DocumentManager} of this {@link RestSession}.
	 */
	public getDocumentManager(): DocumentManager<T_REST_DOCUMENT> {
		return this.documentManager;
	}

	/**
	 * Returns the active {@link AdministrationManager} of this {@link RestSession}.
	 *
	 * @return The active {@link AdministrationManager} of this {@link RestSession}.
	 */
	public getAdministrationManager(): AdministrationManager<T_REST_DOCUMENT> {
		return this.administrationManager;
	}

	/**
	 * Returns the {@link UserCredentials} logged in via this {@link RestSession}.
	 *
	 * @return The {@link UserCredentials} logged in via this {@link RestSession}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async getUser(): Promise<UserCredentials> {
		if (typeof this.user === "undefined") {
			let userRequest: HttpRestRequest = await HttpRestRequest.createRequest(this)
				.buildRequest(HttpMethod.GET, this.getURL(AbstractRestSession.INFO_PATH));
			this.user = UserCredentials.fromJson(await userRequest.executeRequest());
		}

		return this.user;
	}

	/**
	 * Returns the {@link UserCertificates} logged in via this {@link RestSession}.
	 *
	 * @return The {@link UserCertificates} of the logged in user in this {@link RestSession}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async getCertificates(): Promise<UserCertificates> {
		if (typeof this.certificates === "undefined") {
			let certificateRequest: HttpRestRequest = await HttpRestRequest.createRequest(this)
				.buildRequest(HttpMethod.GET, this.getURL(AbstractRestSession.CERTIFICATES_PATH));
			this.certificates = UserCertificates.fromJson(
				await certificateRequest.executeRequest()
			);
		}

		return this.certificates;
	}

	/**
	 * Updates the {@link KeyStorePassword}s for specific keystore and returns the
	 * {@link UserCertificates} for the currently logged in user afterwards.
	 *
	 * @param keystoreName 	   The name of the keystore to be updated.
	 * @param keyStorePassword The {@link KeyStorePassword} to unlock the certificates with.
	 * @return The {@link UserCertificates} of the logged in user in this {@link RestSession}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async updateCertificates(keystoreName: string, keyStorePassword: KeyStorePassword):
		Promise<UserCertificates | undefined> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this)
			.buildRequest(
				HttpMethod.PUT,
				this.getURL("authentication/user/certificates/passwords/" + keystoreName),
				JSON.stringify(keyStorePassword.toJson()),
				DataFormats.JSON.getMimeType()
			);

		this.certificates = UserCertificates.fromJson(
			await request.executeRequest()
		);

		return this.certificates;
	}

	/**
	 * Close the {@link RestSession}.
	 *
	 * @throws ResultException Shall be thrown, if closing the {@link RestSession} failed.
	 */
	public async close(): Promise<void> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this)
			.buildRequest(HttpMethod.GET, this.getURL(AbstractRestSession.LOGOUT_PATH));

		await request.executeRequest();
	}

	/**
	 * Creates a new {@link DocumentManager} matching this {@link RestSession}.
	 *
	 * @return The created {@link DocumentManager}.
	 */
	protected abstract createDocumentManager(): DocumentManager<T_REST_DOCUMENT>;

	/**
	 * Creates a new {@link AdministrationManager} matching this {@link RestSession}.
	 *
	 * @return The created {@link AdministrationManager}.
	 */
	protected abstract createAdministrationManager(): AdministrationManager<T_REST_DOCUMENT>;

	public abstract createWebServiceInstance<T_WEBSERVICE extends RestWebService<any, any, any>>(
		webServiceType: WebServiceType
	): T_WEBSERVICE;

	/**
	 * This is a shortcut for {@link DocumentManager#uploadDocument} and uploads the given source
	 * to the webPDF server.
	 *
	 * @param data     The document {@link Blob} to upload.
	 * @param fileName The name of the uploaded document.
	 * @param options  Additional request options - see {@link HttpRestRequest}.
	 * @return The uploaded {@link RestWebServiceDocument}.
	 * @throws ResultException Shall be thrown, should the upload have failed.
	 */
	public abstract uploadDocument(
		data: Blob,
		fileName: string,
		options: { onProgress?: (event: any) => void; abortSignal?: AbortSignal }
	): Promise<T_REST_DOCUMENT>;
}