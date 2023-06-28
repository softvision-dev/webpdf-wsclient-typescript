import {AbstractDocument} from "../../documents";
import {RestDocument} from "./RestDocument";
import {RestWebServiceDocumentState} from "./RestWebServiceDocumentState";
import {DocumentFile, FileFilter, HistoryEntry, Info, InfoType, PdfPassword} from "../../../generated-sources";
import {AxiosProgressEvent} from "axios";

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
	 * Returns the document ID of the managed {@link RestDocument}.
	 *
	 * @return The document ID of the managed {@link RestDocument}.
	 */
	public getDocumentId(): string {
		return this.accessInternalState().getDocumentId();
	}

	/**
	 * Returns the {@link DocumentFile} of the managed {@link RestDocument}.
	 *
	 * @return The {@link DocumentFile} of the managed {@link RestDocument}.
	 */
	public getDocumentFile(): DocumentFile {
		return this.accessInternalState().getDocumentFile();
	}

	/**
	 * Returns the {@link HistoryEntry}s of the managed {@link RestDocument}.
	 *
	 * @return The {@link HistoryEntry}s of the managed {@link RestDocument}.
	 */
	public getHistory(): Array<HistoryEntry> {
		return this.accessInternalState().getHistory();
	}

	/**
	 * Returns a {@link HistoryEntry} from the internal history map, by given history ID.
	 *
	 * @param historyId The history ID of the {@link HistoryEntry} that shall be returned.
	 * @return A {@link HistoryEntry} representing a historic state of the uploaded resource.
	 * @throws ResultException Shall be thrown, should accessing the document history fail.
	 */
	public getHistoryEntry(historyId: number): HistoryEntry {
		return this.accessInternalState().getHistoryEntry(historyId);
	}

	/**
	 * Returns the currently active {@link HistoryEntry}.
	 *
	 * @return The currently active {@link HistoryEntry}.
	 * @throws ResultException Shall be thrown, when updating the document history failed.
	 */
	public activeHistory(): HistoryEntry {
		return this.accessInternalState().activeHistory();
	}

	/**
	 * Updates the given {@link HistoryEntry} in the internally managed document history.
	 *
	 * @param historyEntry The {@link HistoryEntry} containing the values to be set.
	 * @throws ResultException Shall be thrown, when updating the document history failed.
	 */
	public updateHistoryEntry(historyEntry: HistoryEntry): void {
		this.accessInternalState().updateHistoryEntry(historyEntry);
	}

	/**
	 * Returns the most recent {@link HistoryEntry}.
	 *
	 * @return The most recent {@link HistoryEntry}.
	 * @throws ResultException Shall be thrown, when updating the document history failed.
	 */
	public lastHistory(): HistoryEntry {
		return this.accessInternalState().lastHistory();
	}

	/**
	 * Returns the number of known {@link HistoryEntry}s for this {@link RestWebServiceDocument}.
	 *
	 * @return The number of known {@link HistoryEntry}s for this {@link RestWebServiceDocument}.
	 */
	public getHistorySize(): number {
		return this.accessInternalState().getHistorySize();
	}

	/**
	 * This is a shortcut for {@link DocumentManager#downloadDocument} and attempts to download and write the
	 * {@link RestDocument} to the returned {@link Buffer}.
	 *
	 * @param options  Additional request options - see {@link HttpRestRequest}.
	 * @throws ResultException Shall be thrown, should writing the result document fail.
	 */
	public downloadDocument(options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<Buffer> {
		return this.accessInternalState().getDocumentManager().downloadDocument(this.getDocumentId(), options);
	}

	/**
	 * This is a shortcut for {@link DocumentManager#deleteDocument} and deletes the {@link RestDocument}.
	 *
	 * @throws ResultException Shall be thrown, should deleting the document fail.
	 */
	public async deleteDocument(): Promise<void> {
		await this.accessInternalState().getDocumentManager().deleteDocument(this.getDocumentId());
	}

	/**
	 * This is a shortcut for {@link DocumentManager#renameDocument} and renames the {@link RestDocument}.
	 *
	 * @param fileName   The new name for the {@link RestDocument}.
	 * @return The resulting {@link RestDocument} handle.
	 * @throws ResultException Shall be thrown, should renaming the document have failed.
	 */
	public async renameDocument(fileName: string): Promise<RestDocument> {
		return await this.accessInternalState().getDocumentManager().renameDocument(this.getDocumentId(), fileName);
	}

	/**
	 * This is a shortcut for {@link DocumentManager#renameDocument} and updates the security information the
	 * {@link RestDocument}.
	 *
	 * @param passwordType The security information to update the document with
	 * @return The updated {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should updating the document security have failed.
	 */
	public async updateDocumentSecurity(passwordType: PdfPassword): Promise<RestDocument> {
		return await this.accessInternalState().getDocumentManager().updateDocumentSecurity(
			this.getDocumentId(), passwordType
		);
	}

	/**
	 * This is a shortcut for {@link DocumentManager#renameDocument} and returns {@link Info} about the
	 * {@link RestDocument}.
	 *
	 * @param infoType     Detailed information for the document referenced by the unique documentId
	 *                     in the server´s document storage.
	 * @return The requested document {@link Info}
	 * @throws ResultException Shall be thrown, should fetching the document info have failed.
	 */
	public async getDocumentInfo(infoType: InfoType): Promise<Info> {
		return await this.accessInternalState().getDocumentManager().getDocumentInfo(this.getDocumentId(), infoType);
	}

	/**
	 * This is a shortcut for {@link DocumentManager#extractDocument} and extracts the {@link RestDocument}.
	 *
	 * @param fileFilter   A {@link FileFilter} with a list of "include" and "exclude" filter rules. First, the
	 * 					   "include rules" are applied. If a file matches, the "exclude rules" are applied. Only if
	 * 					   both rules apply, the file will be passed through the filter.
	 * 					   @return
	 * @return A list of the extracted {@link RestDocument}s.
	 * @throws ResultException Shall be thrown, should the extraction have failed.
	 */
	public async extractDocument(fileFilter?: FileFilter): Promise<Array<RestDocument>> {
		return await this.accessInternalState().getDocumentManager().extractDocument(this.getDocumentId(), fileFilter);
	}
}
