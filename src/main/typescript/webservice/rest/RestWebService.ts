import {AbstractWebService} from "../AbstractWebService";
import {DataFormats, DocumentManager, HttpMethod, HttpRestRequest, RestDocument, RestSession} from "../../session";
import {WebServiceType} from "../WebServiceType";
import {Billing, DocumentFile, Parameter, PdfPassword, Settings} from "../../generated-sources";
import {ClientResultException, WsclientErrors} from "../../exception";

/**
 * An instance of {@link RestWebService} wraps a wsclient connection to a specific webPDF webservice endpoint
 * ({@link WebServiceType}), using {@link WebServiceProtocol#REST} and expecting a {@link RestDocument}
 * as the result.
 *
 * @param <T_OPERATION_DATA>      The operation type of the targeted webservice endpoint.
 * @param <T_OPERATION_PARAMETER> The parameter type of the targeted webservice endpoint.
 * @param <T_REST_DOCUMENT>       The expected {@link RestDocument} type for the documents used by the webPDF server.
 */
export abstract class RestWebService<T_OPERATION_DATA extends Parameter, T_OPERATION_PARAMETER,
	T_REST_DOCUMENT extends RestDocument>
	extends AbstractWebService<RestSession<T_REST_DOCUMENT>, T_OPERATION_DATA, T_OPERATION_PARAMETER, T_REST_DOCUMENT,
		Billing, PdfPassword, Settings> {
	/**
	 * Creates a webservice interface of the given {@link WebServiceType} for the given {@link RestSession}.
	 *
	 * @param session        The {@link RestSession} the webservice interface shall be created for.
	 * @param webServiceType The {@link WebServiceType} interface, that shall be created.
	 */
	public constructor(session: RestSession<T_REST_DOCUMENT>, webServiceType: WebServiceType) {
		super(webServiceType, session);
	}

	/**
	 * <p>
	 * Execute the webservice operation or optionally for the given source {@link T_REST_DOCUMENT} and return the
	 * resulting {@link T_REST_DOCUMENT}.
	 * </p>
	 *
	 * @template T_REST_DOCUMENT
	 * @param sourceDocument The source {@link T_REST_DOCUMENT}, that shall be processed.
	 * @return The resulting {@link T_REST_DOCUMENT}.
	 * @throws ResultException Shall be thrown, upon an execution failure.
	 */
	public async process(sourceDocument?: T_REST_DOCUMENT): Promise<T_REST_DOCUMENT | undefined> {
		let endpoint: string = this.getWebServiceType().getRestEndpoint().replace(
			WebServiceType.ID_PLACEHOLDER, typeof sourceDocument !== "undefined" ? sourceDocument.getDocumentId() : "new"
		);

		let url: URL = this.getSession().getURL(endpoint);
		let documentManager: DocumentManager<T_REST_DOCUMENT> = this.getSession().getDocumentManager();

		if (typeof sourceDocument === "undefined") {
			url.searchParams.set("history", String(documentManager.isDocumentHistoryActive()));
		}

		for (let [key, value] of this.getAdditionalParameter().entries()) {
			url.searchParams.set(key, value);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.getSession())
			.buildRequest(HttpMethod.POST, url, JSON.stringify(this.getWebServiceOptions()), DataFormats.JSON.getMimeType());
		let documentFile: DocumentFile = await request.executeRequest();
		return documentManager.synchronizeDocument(documentFile);
	}

	/**
	 * Creates a {@link Body} reflecting the webservice parameters.
	 *
	 * @return A {@link Body} reflecting the webservice parameters.
	 * @throws ResultException Shall be thrown, should the {@link Body} creation fail.
	 */
	protected getWebServiceOptions(): Body {
		try {
			return this.getOperationData().toJson();
		} catch (ex: any) {
			throw new ClientResultException(WsclientErrors.XML_OR_JSON_CONVERSION_FAILURE, ex);
		}
	};
}