import {AbstractRestSession} from "./AbstractRestSession";
import {SessionContext} from "../connection";
import {AuthenticationProvider} from "../auth";
import {DocumentManager, RestWebServiceDocument, RestWebServiceDocumentManager} from "./documents";
import {AdministrationManager, RestAdministrationManager} from "./administration";
import {RestSession} from "./RestSession";
import {RestWebService, WebServiceFactory, WebServiceType} from "../../webservice";

/**
 * <p>
 * An instance of {@link RestWebServiceSession} establishes and manages a {@link WebServiceProtocol#REST} connection
 * with a webPDF server.
 * </p>
 * <p>
 * <b>Information:</b> A {@link RestWebServiceSession} provides simplified access to the uploaded {@link RestDocument}s
 * via a specialized {@link RestWebServiceDocumentManager}.
 * </p>
 */
export class RestWebServiceSession extends AbstractRestSession<RestWebServiceDocument>
	implements RestSession<RestWebServiceDocument> {
	/**
	 * <p>
	 * Creates a new {@link RestWebServiceSession} instance providing connection information, authorization objects and
	 * a {@link RestWebServiceDocumentManager} for a webPDF server-client {@link RestSession}.
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
	 * @throws ResultException Shall be thrown, in case establishing the session failed.
	 */
	public constructor(serverContext: SessionContext, authProvider: AuthenticationProvider) {
		super(serverContext, authProvider);
	}

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
	public async uploadDocument(data: Blob, fileName: string, options?: {
		onProgress?: (event: any) => void,
		abortSignal?: AbortSignal
	}): Promise<RestWebServiceDocument> {
		return this.getDocumentManager().uploadDocument(data, fileName, options);
	}

	/**
	 * Creates a new {@link DocumentManager} matching the given document type.
	 */
	protected createDocumentManager(): DocumentManager<RestWebServiceDocument> {
		return new RestWebServiceDocumentManager(this);
	}

	/**
	 * Creates a new {@link AdministrationManager} matching this {@link RestSession}.
	 *
	 * @return The created {@link AdministrationManager}.
	 */
	protected createAdministrationManager(): AdministrationManager<RestWebServiceDocument> {
		return new RestAdministrationManager(this);
	}

	/**
	 * Creates a matching {@link RestWebService} instance to execute a webPDF operation for the current session.
	 *
	 * @template T_WEBSERVICE
	 * @param {T_WEBSERVICE} The {@link WebServiceType} to create an interface for.
	 * @param webServiceType The {@link WebServiceType} to create an interface for.
	 * @return A matching {@link RestWebService} instance.
	 * @throws ResultException Shall be thrown, if the {@link RestWebService} creation failed.
	 */
	public createWebServiceInstance<T_WEBSERVICE extends RestWebService<any, any, any>>
	(webServiceType: WebServiceType): T_WEBSERVICE {
		return WebServiceFactory.createInstance(this, webServiceType) as T_WEBSERVICE;
	}
}
