import {AbstractDocument} from "../../documents";
import {RestDocument} from "./RestDocument";
import {RestWebServiceDocumentState} from "./RestWebServiceDocumentState";
import {DocumentFile, FileExtract, HistoryEntry, Info, InfoType, PdfPassword} from "../../../generated-sources";
import {AxiosProgressEvent} from "axios";
import {Blob} from "buffer";

/**
 * <p>
 * An instance of {@link RestWebServiceDocument} represents a document, that has been uploaded to a webPDF server.
 * </p>
 */
export class RestWebServiceDocument extends AbstractDocument implements RestDocument {
	private readonly documentState: RestWebServiceDocumentState;

	/**
	 * Creates a {@link RestWebServiceDocument} representing the given {@link RestWebServiceDocumentState} to external
	 * actors. The owning {@link DocumentManager} shall have exclusive rights to instantiate such documents.
	 *
	 * @param documentState The internal {@link RestWebServiceDocumentState}, that shall be updated by a
	 *                      {@link DocumentManager} and shall be readable via the methods defined by
	 *                      {@link RestDocument}.
	 */
	public constructor(documentState: RestWebServiceDocumentState) {
		super();
		this.documentState = documentState;
	}

	/**
	 * <p>
	 * Returns the internal {@link RestWebServiceDocumentState}, that shall be updated by a {@link DocumentManager}.<br>
	 * The {@link DocumentManager} shall have exclusive rights to access the internal state of a document.
	 * </p>
	 *
	 * @return the internal {@link RestWebServiceDocumentState}, that shall be updated by a {@link DocumentManager}.
	 */
	public accessInternalState(): RestWebServiceDocumentState {
		return this.documentState;
	}

	/**
	 * @inheritDoc
	 */
	public getDocumentId(): string {
		return this.accessInternalState().getDocumentId();
	}

	/**
	 * @inheritDoc
	 */
	public getDocumentFile(): DocumentFile {
		return this.accessInternalState().getDocumentFile();
	}

	/**
	 * @inheritDoc
	 */
	public getHistory(): Array<HistoryEntry> {
		return this.accessInternalState().getHistory();
	}

	/**
	 * @inheritDoc
	 */
	public getHistoryEntry(historyId: number): HistoryEntry {
		return this.accessInternalState().getHistoryEntry(historyId);
	}

	/**
	 * @inheritDoc
	 */
	public activeHistory(): HistoryEntry {
		return this.accessInternalState().activeHistory();
	}

	/**
	 * @inheritDoc
	 */
	public updateHistoryEntry(historyEntry: HistoryEntry): void {
		this.accessInternalState().updateHistoryEntry(historyEntry);
	}

	/**
	 * @inheritDoc
	 */
	public lastHistory(): HistoryEntry {
		return this.accessInternalState().lastHistory();
	}

	/**
	 * @inheritDoc
	 */
	public getHistorySize(): number {
		return this.accessInternalState().getHistorySize();
	}

	/**
	 * @inheritDoc
	 */
	public downloadDocument(options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<Buffer> {
		return this.accessInternalState().getDocumentManager().downloadDocument(this.getDocumentId(), options);
	}

	/**
	 * @inheritDoc
	 */
	public async deleteDocument(): Promise<void> {
		await this.accessInternalState().getDocumentManager().deleteDocument(this.getDocumentId());
	}

	/**
	 * @inheritDoc
	 */
	public async renameDocument(fileName: string): Promise<RestDocument> {
		return await this.accessInternalState().getDocumentManager().renameDocument(this.getDocumentId(), fileName);
	}

	/**
	 * @inheritDoc
	 */
	public async updateDocumentSecurity(passwordType: PdfPassword): Promise<RestDocument> {
		return await this.accessInternalState().getDocumentManager().updateDocumentSecurity(
			this.getDocumentId(), passwordType
		);
	}

	/**
	 * @inheritDoc
	 */
	public async getDocumentInfo(infoType: InfoType): Promise<Info> {
		return await this.accessInternalState().getDocumentManager().getDocumentInfo(this.getDocumentId(), infoType);
	}

	/**
	 * @inheritDoc
	 */
	public async extractDocument(fileExtract: FileExtract): Promise<Array<RestDocument>> {
		return await this.accessInternalState().getDocumentManager().extractDocument(this.getDocumentId(), fileExtract);
	}

	/**
	 * @inheritDoc
	 */
	public async extractArchiveFile(archivePath: string): Promise<Buffer> {
		return await this.accessInternalState().getDocumentManager().extractArchiveFile(
			this.getDocumentId(), archivePath
		);
	}

	/**
	 * @inheritDoc
	 */
	public async updateDocument(data: Blob): Promise<RestDocument> {
		return await this.accessInternalState().getDocumentManager().updateDocument(this.getDocumentId(), data);
	}
}
