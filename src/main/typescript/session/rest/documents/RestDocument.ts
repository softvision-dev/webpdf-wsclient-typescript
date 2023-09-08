import {Document} from "../../documents"
import {DocumentFile, FileExtract, HistoryEntry, Info, InfoType, PdfPassword} from "../../../generated-sources";
import {AxiosProgressEvent} from "axios";

/**
 * <p>
 * A class implementing {@link RestDocument} represents a document, that has been uploaded to a webPDF server.
 * </p>
 */
export interface RestDocument extends Document {
	/**
	 * Returns the document ID of the managed {@link RestDocument}.
	 *
	 * @return The document ID of the managed {@link RestDocument}.
	 */
	getDocumentId(): string

	/**
	 * Returns the {@link DocumentFile} of the managed {@link RestDocument}.
	 *
	 * @return The {@link DocumentFile} of the managed {@link RestDocument}.
	 */
	getDocumentFile(): DocumentFile;

	/**
	 * Returns the {@link HistoryEntry}s of the managed {@link RestDocument}.
	 *
	 * @return The {@link HistoryEntry}s of the managed {@link RestDocument}.
	 */
	getHistory(): Array<HistoryEntry>;

	/**
	 * Returns a {@link HistoryEntry} from the internal history map, by given history ID.
	 *
	 * @param historyId The history ID of the {@link HistoryEntry} that shall be returned.
	 * @return A {@link HistoryEntry} representing a historic state of the uploaded resource.
	 * @throws ResultException Shall be thrown, should accessing the document history fail.
	 */
	getHistoryEntry(historyId: number): HistoryEntry;

	/**
	 * Returns the currently active {@link HistoryEntry}.
	 *
	 * @return The currently active {@link HistoryEntry}.
	 * @throws ResultException Shall be thrown, when updating the document history failed.
	 */
	activeHistory(): HistoryEntry;

	/**
	 * Updates the given {@link HistoryEntry} in the internally managed document history.
	 *
	 * @param historyEntry The {@link HistoryEntry} containing the values to be set.
	 * @throws ResultException Shall be thrown, when updating the document history failed.
	 */
	updateHistoryEntry(historyEntry: HistoryEntry): void;

	/**
	 * Returns the most recent {@link HistoryEntry}.
	 *
	 * @return The most recent {@link HistoryEntry}.
	 * @throws ResultException Shall be thrown, when updating the document history failed.
	 */
	lastHistory(): HistoryEntry;

	/**
	 * Returns the number of known {@link HistoryEntry}s for this {@link RestWebServiceDocument}.
	 *
	 * @return The number of known {@link HistoryEntry}s for this {@link RestWebServiceDocument}.
	 */
	getHistorySize(): number;

	/**
	 * This is a shortcut for {@link DocumentManager#downloadDocument} and
	 * Attempts to download and write the {@link RestDocument} to the returned {@link Buffer}.
	 *
	 * @param options  Additional request options - see {@link HttpRestRequest}.
	 * @throws ResultException Shall be thrown, should writing the result document fail.
	 */
	downloadDocument(options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<Buffer>;

	/**
	 * This is a shortcut for {@link DocumentManager#deleteDocument} and deletes the {@link RestDocument}.
	 *
	 * @throws ResultException Shall be thrown, should deleting the document fail.
	 */
	deleteDocument(): Promise<void>;

	/**
	 * This is a shortcut for {@link DocumentManager#renameDocument} and renames the {@link RestDocument}.
	 *
	 * @param fileName   The new name for the {@link RestDocument}.
	 * @return The resulting {@link RestDocument} handle.
	 * @throws ResultException Shall be thrown, should renaming the document have failed.
	 */
	renameDocument(fileName: string): Promise<RestDocument>;

	/**
	 * This is a shortcut for {@link DocumentManager#renameDocument} and updates the security information the
	 * {@link RestDocument}.
	 *
	 * @param passwordType The security information to update the document with
	 * @return The updated {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should updating the document security have failed.
	 */
	updateDocumentSecurity(passwordType: PdfPassword): Promise<RestDocument>;

	/**
	 * This is a shortcut for {@link DocumentManager#renameDocument} and returns {@link Info} about the
	 * {@link RestDocument}.
	 *
	 * @param infoType     Detailed information for the document referenced by the unique documentId
	 *                     in the server´s document storage.
	 * @return The requested document {@link Info}
	 * @throws ResultException Shall be thrown, should fetching the document info have failed.
	 */
	getDocumentInfo(infoType: InfoType): Promise<Info>;

	/**
	 * This is a shortcut for {@link DocumentManager#extractDocument} and extracts the {@link RestDocument}.
	 *
	 * @param fileExtract   {@link FileExtract} settings for unpacking the archive document.
	 * @return A list of the extracted {@link RestDocument}s.
	 * @throws ResultException Shall be thrown, should the extraction have failed.
	 */
	extractDocument(fileExtract: FileExtract): Promise<Array<RestDocument>>;

	/**
	 * This is a shortcut for {@link DocumentManager#extractDocument} and extracts the {@link RestDocument}.
	 *
	 * @param data The data {@link Blob} or {@link Buffer} to update the document with.
	 * @return The updated {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should the update have failed.
	 */
	updateDocument(data: Blob | Buffer): Promise<RestDocument>;
}
