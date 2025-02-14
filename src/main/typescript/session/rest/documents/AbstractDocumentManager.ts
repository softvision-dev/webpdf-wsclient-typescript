import {RestDocument} from "./RestDocument";
import {DocumentManager} from "./DocumentManager";
import {RestSession} from "../RestSession";
import {
	DocumentFile,
	FileCompress,
	FileCompressInterface,
	FileExtract,
	FileUpdate,
	HistoryEntry,
	Info,
	InfoType,
	Parameter,
	PdfPassword
} from "../../../generated-sources";
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
	 * @inheritDoc
	 */
	public getSession(): RestSession<T_REST_DOCUMENT> {
		return this.session;
	}

	/**
	 * @inheritDoc
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
	 * @inheritDoc
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
	 * @inheritDoc
	 */
	public getDocument(documentId: string): T_REST_DOCUMENT {
		if (!this.containsDocument(documentId)) {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		return this.documentMap.get(documentId)!;
	}

	/**
	 * @inheritDoc
	 */
	public getDocuments(): Array<T_REST_DOCUMENT> {
		return Array.from(this.documentMap.values());
	}

	/**
	 * @inheritDoc
	 */
	public containsDocument(documentId: string): boolean {
		return this.documentMap.has(documentId);
	}

	/**
	 * @inheritDoc
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
	 * @inheritDoc
	 */
	public async downloadArchive(documentIdList: Array<string>, options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<Buffer> {
		for (let documentId of documentIdList) {
			if (!this.containsDocument(documentId)) {
				throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
			}
		}

		let fileCompress: FileCompress = new FileCompress({
			documentIdList: documentIdList,
			storeArchive: false,
			archiveFileName: "files"
		} as FileCompressInterface);

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAcceptHeader(DataFormats.OCTET_STREAM.getMimeType())
			.setOnDownloadProgress(options?.onProgress)
			.setAbortSignal(options?.abortSignal)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("documents/compress"),
				this.prepareHttpEntity(fileCompress),
				DataFormats.JSON.getMimeType()
			);

		return await request.executeRequest();
	}

	/**
	 * @inheritDoc
	 */
	public async uploadDocument(data: Blob, fileName: string, options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<T_REST_DOCUMENT> {
		let formData: FormData = new wsclientConfiguration.FormData();
		formData.append('filedata', data as any, fileName);

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
	 * @inheritDoc
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
	 * @inheritDoc
	 */
	public async renameDocument(documentId: string, fileName: string): Promise<T_REST_DOCUMENT> {
		if (!this.containsDocument(documentId)) {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		let parameter: FileUpdate = new FileUpdate({
			fileName: fileName
		});

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("documents/" + documentId + "/update"),
				this.prepareHttpEntity(parameter),
				DataFormats.JSON.getMimeType()
			);

		let documentFile: DocumentFile = DocumentFile.fromJson(
			await request.executeRequest()
		);

		return this.synchronizeDocument(documentFile);
	}


	/**
	 * @inheritDoc
	 */
	public isDocumentHistoryActive(): boolean {
		return this.documentHistoryActive;
	}

	/**
	 * @inheritDoc
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
	 * @inheritDoc
	 */
	public getDocumentHistory(documentId: string): Array<HistoryEntry> {
		if (!this.isDocumentHistoryActive()) {
			throw new ClientResultException(WsclientErrors.INVALID_HISTORY_DATA);
		}

		return this.getDocument(documentId).getHistory();
	}


	/**
	 * @inheritDoc
	 */
	public getDocumentHistoryEntry(documentId: string, historyId: number): HistoryEntry {
		if (!this.isDocumentHistoryActive()) {
			throw new ClientResultException(WsclientErrors.INVALID_HISTORY_DATA);
		}

		return this.getDocument(documentId).getHistoryEntry(historyId);
	}

	/**
	 * @inheritDoc
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
	 * @inheritDoc
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
	 * @inheritDoc
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

	/**
	 * @inheritDoc
	 */
	public async extractDocument(documentId: string, fileExtract: FileExtract): Promise<Array<T_REST_DOCUMENT>> {
		if (!this.containsDocument(documentId)) {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("documents/" + documentId + "/extract"),
				this.prepareHttpEntity(fileExtract),
				DataFormats.JSON.getMimeType()
			);

		let requestData: Array<any> = await request.executeRequest();
		let documentFileList: Array<DocumentFile> = requestData.map((data) => DocumentFile.fromJson(data));

		let resultDocuments: Array<T_REST_DOCUMENT> = [];
		for (let documentFile of documentFileList) {
			resultDocuments.push(await this.synchronizeDocument(documentFile));
		}

		return resultDocuments;
	}

	/**
	 * @inheritDoc
	 */
	public async extractArchiveFile(documentId: string, archivePath: string): Promise<Buffer> {
		if (!this.containsDocument(documentId)) {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAcceptHeader(DataFormats.OCTET_STREAM.getMimeType())
			.buildRequest(
				HttpMethod.GET,
				this.session.getURL("documents/" + documentId + "/archive/" + archivePath)
			);

		return await request.executeRequest();
	}

	/**
	 * @inheritDoc
	 */
	public async compressDocuments(fileCompress: FileCompress): Promise<T_REST_DOCUMENT> {
		let documentIdList: Array<string> = [];
		if (typeof fileCompress.documentIdList !== "undefined") {
			documentIdList = fileCompress.documentIdList;
		}

		for (let documentId of documentIdList) {
			if (!this.containsDocument(documentId)) {
				throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
			}
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAcceptHeader(DataFormats.JSON.getMimeType())
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("documents/compress"),
				this.prepareHttpEntity(fileCompress),
				DataFormats.JSON.getMimeType()
			);

		let documentFile: DocumentFile = DocumentFile.fromJson(
			await request.executeRequest()
		);

		return await this.synchronizeDocument(documentFile);
	}

	/**
	 * @inheritDoc
	 */
	public async updateDocument(documentId: string, data: Blob): Promise<T_REST_DOCUMENT> {
		if (!this.containsDocument(documentId)) {
			throw new ClientResultException(WsclientErrors.INVALID_DOCUMENT);
		}

		let restDocument: T_REST_DOCUMENT = this.getDocument(documentId);
		let documentFile: DocumentFile = restDocument.getDocumentFile();

		let formData: FormData = new wsclientConfiguration.FormData();
		formData.append(
			'filedata', data as any, documentFile.fileName + "." + documentFile.fileExtension
		);

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.PUT,
				this.session.getURL("documents/" + documentId),
				formData
			);

		documentFile = DocumentFile.fromJson(
			await request.executeRequest()
		);

		return await this.synchronizeDocument(documentFile);
	}
}
