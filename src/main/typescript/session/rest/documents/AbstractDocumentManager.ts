import {RestDocument} from "./RestDocument";
import {DocumentManager} from "./DocumentManager";
import {RestSession} from "../RestSession";
import {DocumentFile, HistoryEntry, Info, InfoType, Parameter, PdfPassword} from "../../../generated-sources";
import {HttpMethod, HttpRestRequest} from "../../connection";
import {ClientResultException, WsclientErrors} from "../../../exception";
import {DataFormats} from "../../DataFormat";
import {AxiosProgressEvent} from "axios";
import {RestDocumentState} from "./RestDocumentState";
import {wsclientConfiguration} from "../../../configuration";

/**
 * An instance of {@link AbstractDocumentManager} allows to monitor and interact with the {@link RestDocument}s uploaded
 * to a {@link RestSession} of the webPDF server.
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} type managed by the {@link AbstractDocumentManager}.
 */
export abstract class AbstractDocumentManager<T_REST_DOCUMENT extends RestDocument>
	implements DocumentManager<T_REST_DOCUMENT> {
	protected readonly session: RestSession<T_REST_DOCUMENT>;
	protected documentMap: Map<String, T_REST_DOCUMENT>;
	protected documentHistoryActive: boolean;

	/**
	 * Initializes a {@link DocumentManager} for the given {@link RestSession}.
	 *
	 * @param session The {@link RestSession} a {@link DocumentManager} shall be created for.
	 */
	public constructor(session: RestSession<T_REST_DOCUMENT>) {
		this.session = session;
		this.documentMap = new Map<String, T_REST_DOCUMENT>();
		this.documentHistoryActive = false;
	}

	/**
	 * Returns the {@link RestSession} the {@link DocumentManager} is managing {@link RestDocument}s for.
	 *
	 * @return The {@link RestSession} the {@link DocumentManager} is managing {@link RestDocument}s for.
	 */
	public getSession(): RestSession<T_REST_DOCUMENT> {
		return this.session;
	}

	/**
	 * Synchronizes the given {@link DocumentFile} with the matching {@link RestDocument} managed by this
	 * {@link DocumentManager}.
	 *
	 * @return The synchronized {@link RestDocument}.
	 * @throws ResultException Shall be thrown upon a synchronization failure.
	 */
	public async synchronizeDocument(documentFile: DocumentFile): Promise<T_REST_DOCUMENT> {
		if (documentFile.documentId === "") {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		let synchronizedDocument: T_REST_DOCUMENT;
		if (this.containsDocument(documentFile.documentId)) {
			synchronizedDocument = this.getDocument(documentFile.documentId);
			this.accessInternalState(synchronizedDocument).setDocumentFile(documentFile);
		} else {
			synchronizedDocument = await this.createDocumentByFile(documentFile);
		}

		if (this.isDocumentHistoryActive()) {
			await this.synchronizeDocumentHistory(documentFile.documentId);
		}

		return synchronizedDocument;
	}

	/**
	 * Synchronizes the {@link RestDocument}s of this {@link DocumentManager} with the actually uploaded documents of
	 * the webPDF server.
	 *
	 * @return A list of the synchronized {@link RestDocument}s.
	 * @throws ResultException Shall be thrown upon a synchronization failure.
	 */
	public async synchronize(fileList?: Array<DocumentFile>): Promise<Array<T_REST_DOCUMENT>> {
		let documentFileList: Array<DocumentFile>;

		if (typeof fileList === "undefined") {
			let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
				.buildRequest(HttpMethod.GET, this.session.getURL("documents/list"));
			let requestData: Array<any> = await request.executeRequest();

			documentFileList = requestData.map((data) => DocumentFile.fromJson(data));
		} else {
			documentFileList = fileList;
		}

		for (let documentFile of documentFileList) {
			await this.synchronizeDocument(documentFile);
		}

		let currentDocumentFileList: Array<T_REST_DOCUMENT> = this.getDocuments();
		for (let documentFile of currentDocumentFileList) {
			if (documentFileList.find((compare: DocumentFile) => compare.documentId === documentFile.getDocumentId())) {
				continue;
			}

			this.documentMap.delete(documentFile.getDocumentId());
		}

		return this.getDocuments();
	}

	/**
	 * Returns the {@link RestDocument} that is known to the {@link DocumentManager} for the given document ID.
	 *
	 * @param documentId The document ID a {@link RestDocument} shall be found for.
	 * @return The {@link RestDocument} mapped to the given document ID.
	 * @throws ResultException Shall be thrown, if requesting the document failed.
	 */
	public getDocument(documentId: string): T_REST_DOCUMENT {
		if (!this.containsDocument(documentId)) {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		return this.documentMap.get(documentId)!;
	}

	/**
	 * Returns a list of all {@link RestDocument}s known to this {@link DocumentManager}.
	 *
	 * @return A list of all {@link RestDocument}s known to this {@link DocumentManager}.
	 */
	public getDocuments(): Array<T_REST_DOCUMENT> {
		return Array.from(this.documentMap.values());
	}

	/**
	 * Returns true, if this {@link DocumentManager} contains a {@link RestDocument} with the given ID.
	 *
	 * @param documentId The document ID, that shall be checked for existence.
	 * @return true, if this {@link DocumentManager} contains a {@link RestDocument} with the given ID.
	 */
	public containsDocument(documentId: string): boolean {
		return this.documentMap.has(documentId);
	}

	/**
	 * Downloads the {@link RestDocument} with the given document ID and returns it as {@link Buffer}.
	 *
	 * @param documentId   The document ID of the {@link RestDocument} to download.
	 * @param options      Additional request options - see {@link HttpRestRequest}.
	 * @return The {@link Buffer} of the downloaded {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should the download have failed.
	 */
	public async downloadDocument(documentId: string, options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<Buffer> {
		if (!this.containsDocument(documentId)) {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAcceptHeader(DataFormats.OCTET_STREAM.getMimeType())
			.setOnDownloadProgress(options?.onProgress)
			.setAbortSignal(options?.abortSignal)
			.buildRequest(HttpMethod.GET, this.session.getURL("documents/" + documentId));

		return await request.executeRequest();
	}

	/**
	 * Uploads the given {@link Blob} to the webPDF server as a document resource with the given file name, adds
	 * it to this {@link DocumentManager} and returns the resulting {@link RestDocument} handle.
	 *
	 * @param data     The document {@link Blob} to upload.
	 * @param fileName The name of the uploaded document.
	 * @param options  Additional request options - see {@link HttpRestRequest}.
	 * @return The resulting {@link RestDocument} handle.
	 * @throws ResultException Shall be thrown, should the upload have failed.
	 */
	public async uploadDocument(data: Blob, fileName: string, options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<T_REST_DOCUMENT> {
		let formData: FormData = new wsclientConfiguration.FormData();
		formData.append('filedata', data, fileName);

		let searchParams: URLSearchParams = new URLSearchParams();
		searchParams.set("history", String(this.isDocumentHistoryActive()));

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setOnUploadProgress(options?.onProgress)
			.setAbortSignal(options?.abortSignal)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("documents", searchParams),
				formData
			);

		let documentFile: DocumentFile = DocumentFile.fromJson(
			await request.executeRequest()
		);

		return await this.synchronizeDocument(documentFile);
	}

	/**
	 * Deletes the {@link RestDocument} with the given document ID from the webPDF server.
	 *
	 * @param documentId The document ID of the {@link RestDocument} to delete.
	 * @throws ResultException Shall be thrown, should deleting the document have failed.
	 */
	public async deleteDocument(documentId: string): Promise<void> {
		if (!this.containsDocument(documentId)) {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.DELETE, this.session.getURL("documents/" + documentId));

		await request.executeRequest();

		this.documentMap.delete(documentId);
	}

	/**
	 * Rename the {@link RestDocument} with the given document ID.
	 *
	 * @param documentId The document ID of the {@link RestDocument} to rename.
	 * @param fileName   The new name for the {@link RestDocument}.
	 * @return The resulting {@link RestDocument} handle.
	 * @throws ResultException Shall be thrown, should renaming the document have failed.
	 */
	public async renameDocument(documentId: string, fileName: string): Promise<T_REST_DOCUMENT> {
		if (!this.containsDocument(documentId)) {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		let restDocument: T_REST_DOCUMENT = this.getDocument(documentId);
		let documentFile: DocumentFile = restDocument.getDocumentFile();
		documentFile.fileName = fileName;

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("documents/" + documentId + "/update"),
				this.prepareHttpEntity(documentFile),
				DataFormats.JSON.getMimeType()
			);

		documentFile = DocumentFile.fromJson(
			await request.executeRequest()
		);

		return this.synchronizeDocument(documentFile);
	}


	/**
	 * Checks whether a document history is collected for managed {@link RestDocument}s.
	 *
	 * @return true should collecting the document history be active.
	 */
	public isDocumentHistoryActive(): boolean {
		return this.documentHistoryActive;
	}

	/**
	 * Sets whether a document history shall be collected for managed {@link RestDocument}s.
	 *
	 * @param documentHistoryActive true should collecting the document history be activated.
	 */
	public setDocumentHistoryActive(documentHistoryActive: boolean): void {
		this.documentHistoryActive = documentHistoryActive;

		if (documentHistoryActive) {
			for (let document of this.getDocuments()) {
				this.synchronizeDocumentHistory(document.getDocumentId());
			}
		}
	}

	/**
	 * Returns the {@link HistoryEntry}s known for the {@link RestDocument} with the given document ID.
	 *
	 * @param documentId The document ID of the {@link RestDocument} the history shall be requested for.
	 * @return The {@link HistoryEntry}s known for the selected {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should requesting the document history have failed.
	 */
	public getDocumentHistory(documentId: string): Array<HistoryEntry> {
		if (!this.isDocumentHistoryActive()) {
			throw new ClientResultException(WsclientErrors.INVALID_HISTORY_DATA);
		}

		return this.getDocument(documentId).getHistory();
	}


	/**
	 * Returns the {@link HistoryEntry} with the given history ID for the {@link RestDocument} with the given document
	 * ID.
	 *
	 * @param documentId The document ID of the {@link RestDocument} the {@link HistoryEntry} shall be requested for.
	 * @param historyId  The history ID of the {@link HistoryEntry}, that shall be requested.
	 * @return The selected {@link HistoryEntry}.
	 * @throws ResultException Shall be thrown, should requesting the document history have failed.
	 */
	public getDocumentHistoryEntry(documentId: string, historyId: number): HistoryEntry {
		if (!this.isDocumentHistoryActive()) {
			throw new ClientResultException(WsclientErrors.INVALID_HISTORY_DATA);
		}

		return this.getDocument(documentId).getHistoryEntry(historyId);
	}

	/**
	 * Updates the history of the {@link RestDocument} with the given document ID using the given {@link HistoryEntry}.
	 *
	 * @param documentId   The document ID of the {@link RestDocument} to update.
	 * @param historyEntry The {@link HistoryEntry} to update the contained values for.
	 * @return The updated {@link HistoryEntry}.
	 * @throws ResultException Shall be thrown, should updating the document history have failed.
	 */
	public async updateDocumentHistory(documentId: string, historyEntry: HistoryEntry): Promise<HistoryEntry> {
		if (!this.isDocumentHistoryActive()) {
			throw new ClientResultException(WsclientErrors.INVALID_HISTORY_DATA);
		}

		if (!this.containsDocument(documentId)) {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		let restDocument: T_REST_DOCUMENT = this.documentMap.get(documentId)!;
		let historyId: number = historyEntry.id;

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.PUT,
				this.session.getURL("documents/" + documentId + "/history/" + historyId),
				this.prepareHttpEntity(historyEntry),
				DataFormats.JSON.getMimeType()
			)

		let resultHistoryBean: HistoryEntry = HistoryEntry.fromJson(
			await request.executeRequest()
		);

		restDocument = await this.synchronizeDocumentInfo(restDocument.getDocumentFile());
		this.accessInternalState(restDocument).updateHistoryEntry(resultHistoryBean);

		return resultHistoryBean;
	}

	/**
	 * Creates a new {@link RestWebServiceDocument} for the given document {@link documentFile}.
	 *
	 * @param documentFile The {@link documentFile} a matching {@link RestWebServiceDocument} shall be created for.
	 * @return The created {@link RestWebServiceDocument}.
	 */
	protected abstract createDocument(documentFile: DocumentFile): T_REST_DOCUMENT;

	/**
	 * Creates a new {@link RestDocument} for the given {@link DocumentFile}.
	 *
	 * @param documentFile The {@link DocumentFile} a matching {@link RestDocument} shall be created for.
	 * @return The created {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should creating the document fail.
	 */
	private async createDocumentByFile(documentFile: DocumentFile): Promise<T_REST_DOCUMENT> {
		let restDocument: T_REST_DOCUMENT = this.createDocument(documentFile);
		this.accessInternalState(restDocument).setDocumentFile(documentFile);
		this.documentMap.set(documentFile.documentId, restDocument);
		await this.synchronizeDocumentInfo(documentFile);
		return restDocument;
	}

	/**
	 * Synchronize the state of the given {@link DocumentFile} with the webPDF server.
	 *
	 * @param documentFile The {@link DocumentFile} to synchronize.
	 * @return The matching {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should the synchronization fail.
	 */
	private async synchronizeDocumentInfo(documentFile: DocumentFile): Promise<T_REST_DOCUMENT> {
		let documentId: string = documentFile.documentId;

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL("documents/" + documentId + "/info"))

		let documentResultFile: DocumentFile = DocumentFile.fromJson(
			await request.executeRequest()
		);

		let restDocument: T_REST_DOCUMENT = this.documentMap.get(documentId)!;
		this.accessInternalState(restDocument).setDocumentFile(documentResultFile);

		if (this.isDocumentHistoryActive()) {
			this.synchronizeDocumentHistory(documentId);
		}

		return restDocument;
	}

	/**
	 * Synchronizes the document history for the {@link RestDocument} with the given document ID of this
	 * {@link DocumentManager} and the webPDF server.
	 *
	 * @param documentId The document ID of the {@link RestDocument} to synchronize the document history for.
	 * @throws ResultException Shall be thrown, should synchronizing the document history have failed.
	 */
	private async synchronizeDocumentHistory(documentId: string): Promise<void> {
		let restDocument: T_REST_DOCUMENT = this.getDocument(documentId);

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL("documents/" + documentId + "/history"));

		let requestData: Array<any> = await request.executeRequest();

		let history: Array<HistoryEntry> = requestData.map((data) => HistoryEntry.fromJson(data));

		for (let historyEntry of history) {
			this.accessInternalState(restDocument).updateHistoryEntry(historyEntry);
		}
	}

	/**
	 * Updates the security information of a selected document in the server´s document storage.
	 *
	 * @param documentId   The unique documentId of the document in the server´s document storage.
	 * @param passwordType The security information to update the document with
	 * @return The updated {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should updating the document security have failed.
	 */
	public async updateDocumentSecurity(documentId: string, passwordType: PdfPassword): Promise<T_REST_DOCUMENT> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.PUT,
				this.session.getURL("documents/" + documentId + "/security/password"),
				this.prepareHttpEntity(passwordType),
				DataFormats.JSON.getMimeType()
			);

		let documentFile: DocumentFile = DocumentFile.fromJson(
			await request.executeRequest()
		);

		return await this.synchronizeDocument(documentFile);
	}

	/**
	 * Prepares a {@link Parameter} entity for internal requests to the webPDF server.
	 *
	 * @template T
	 * @param parameter The parameters, that shall be used for the request.
	 * @param {T}       The parameter type (data transfer object/bean) that shall be used.
	 * @return The resulting state of the data transfer object.
	 * @throws ResultException Shall be thrown, should the creation fail.
	 */
	private prepareHttpEntity<T extends Parameter>(parameter: T): string {
		try {
			return JSON.stringify(parameter.toJson());
		} catch (ex: any) {
			throw new ClientResultException(WsclientErrors.XML_OR_JSON_CONVERSION_FAILURE, ex);
		}
	}

	/**
	 * Requests access to the internal {@link RestDocumentState}.
	 *
	 * @param document The {@link RestDocument} to request access for.
	 * @return The internal {@link RestDocumentState}.
	 */
	protected abstract accessInternalState(document: T_REST_DOCUMENT): RestDocumentState<T_REST_DOCUMENT>;

	/**
	 * Returns information about the document selected by documentId in the document storage.
	 *
	 * @param documentId   The unique documentId of the document in the server´s document storage.
	 * @param infoType     Detailed information for the document referenced by the unique documentId
	 *                     in the server´s document storage.
	 * @return The requested document {@link Info}
	 * @throws ResultException Shall be thrown, should fetching the document info have failed.
	 */
	public async getDocumentInfo(documentId: string, infoType: InfoType): Promise<Info> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.GET,
				this.session.getURL("documents/" + documentId + "/info/" + infoType)
			);

		return Info.fromJson(
			await request.executeRequest()
		);
	}
}
