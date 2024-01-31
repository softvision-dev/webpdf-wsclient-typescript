import {RestDocument} from "./RestDocument";
import {RestSession} from "../RestSession";
import {
	DocumentFile, FileCompress,
	FileExtract,
	FileFilter,
	HistoryEntry,
	Info,
	InfoType,
	PdfPassword
} from "../../../generated-sources";
import {AxiosProgressEvent} from "axios";

/**
 * A class implementing {@link DocumentManager} allows to monitor and interact with the {@link RestDocument}s uploaded
 * to a {@link RestSession} of the webPDF server.
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} type managed by the {@link DocumentManager}.
 */
export interface DocumentManager<T_REST_DOCUMENT extends RestDocument> {
	/**
	 * Returns the {@link RestSession} the {@link DocumentManager} is managing {@link RestDocument}s for.
	 *
	 * @return The {@link RestSession} the {@link DocumentManager} is managing {@link RestDocument}s for.
	 */
	getSession(): RestSession<T_REST_DOCUMENT>

	/**
	 * Synchronizes the given {@link DocumentFile} with the matching {@link RestDocument} managed by this
	 * {@link DocumentManager}.
	 *
	 * @return The synchronized {@link RestDocument}.
	 * @throws ResultException Shall be thrown upon a synchronization failure.
	 */
	synchronizeDocument(documentFile: DocumentFile): Promise<T_REST_DOCUMENT>;

	/**
	 * Synchronizes the {@link RestDocument}s of this {@link DocumentManager} with the actually uploaded documents of
	 * the webPDF server or with the given fileList.
	 *
	 * @param fileList An optional {@link Array<DocumentFile>} to sync this {@link DocumentManager} with
	 * @return A list of the synchronized {@link RestDocument}s.
	 * @throws ResultException Shall be thrown upon a synchronization failure.
	 */
	synchronize(fileList?: Array<DocumentFile>): Promise<Array<T_REST_DOCUMENT>>;

	/**
	 * Returns the {@link RestDocument} that is known to the {@link DocumentManager} for the given document ID.
	 *
	 * @param documentId The document ID a {@link RestDocument} shall be found for.
	 * @return The {@link RestDocument} mapped to the given document ID.
	 * @throws ResultException Shall be thrown, if requesting the document failed.
	 */
	getDocument(documentId: string): T_REST_DOCUMENT;

	/**
	 * Returns a list of all {@link RestDocument}s known to this {@link DocumentManager}.
	 *
	 * @return A list of all {@link RestDocument}s known to this {@link DocumentManager}.
	 */
	getDocuments(): Array<T_REST_DOCUMENT>;

	/**
	 * Returns true, if this {@link DocumentManager} contains a {@link RestDocument} with the given ID.
	 *
	 * @param documentId The document ID, that shall be checked for existence.
	 * @return true, if this {@link DocumentManager} contains a {@link RestDocument} with the given ID.
	 */
	containsDocument(documentId: string): boolean;

	/**
	 * Downloads the {@link RestDocument} with the given document ID and returns it as {@link Buffer}.
	 *
	 * @param documentId   The document ID of the {@link RestDocument} to download.
	 * @param options      Additional request options - see {@link HttpRestRequest}.
	 * @return The {@link Buffer} of the downloaded {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should the download have failed.
	 */
	downloadDocument(documentId: string, options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<Buffer>;

	/**
	 * Downloads the {@link RestDocument}s with the given documents IDs as archive and returns it as {@link Buffer}.
	 *
	 * @param documentIdList   	The document IDs of the {@link RestDocument}s to download.
	 * @param options      		Additional request options - see {@link HttpRestRequest}.
	 * @return The {@link Buffer} of the downloaded archived {@link RestDocument}s.
	 * @throws ResultException Shall be thrown, should the download have failed.
	 */
	downloadArchive(documentIdList: Array<string>, options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<Buffer>

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
	uploadDocument(data: Blob, fileName: string, options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<T_REST_DOCUMENT>;

	/**
	 * Deletes the {@link RestDocument} with the given document ID from the webPDF server.
	 *
	 * @param documentId The document ID of the {@link RestDocument} to delete.
	 * @throws ResultException Shall be thrown, should deleting the document have failed.
	 */
	deleteDocument(documentId: string): Promise<void>;

	/**
	 * Rename the {@link RestDocument} with the given document ID.
	 *
	 * @param documentId The document ID of the {@link RestDocument} to rename.
	 * @param fileName   The new name for the {@link RestDocument}.
	 * @return The resulting {@link RestDocument} handle.
	 * @throws ResultException Shall be thrown, should renaming the document have failed.
	 */
	renameDocument(documentId: string, fileName: string): Promise<T_REST_DOCUMENT>;

	/**
	 * Checks whether a document history is collected for managed {@link RestDocument}s.
	 *
	 * @return true should collecting the document history be active.
	 */
	isDocumentHistoryActive(): boolean;

	/**
	 * Sets whether a document history shall be collected for managed {@link RestDocument}s.
	 *
	 * @param documentHistoryActive true should collecting the document history be activated.
	 */
	setDocumentHistoryActive(documentHistoryActive: boolean): void;

	/**
	 * Returns the {@link HistoryEntry}s known for the {@link RestDocument} with the given document ID.
	 *
	 * @param documentId The document ID of the {@link RestDocument} the history shall be requested for.
	 * @return The {@link HistoryEntry}s known for the selected {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should requesting the document history have failed.
	 */
	getDocumentHistory(documentId: string): Array<HistoryEntry>;

	/**
	 * Returns the {@link HistoryEntry} with the given history ID for the {@link RestDocument} with the given document
	 * ID.
	 *
	 * @param documentId The document ID of the {@link RestDocument} the {@link HistoryEntry} shall be requested for.
	 * @param historyId  The history ID of the {@link HistoryEntry}, that shall be requested.
	 * @return The selected {@link HistoryEntry}.
	 * @throws ResultException Shall be thrown, should requesting the document history have failed.
	 */
	getDocumentHistoryEntry(documentId: string, historyId: number): HistoryEntry;

	/**
	 * Updates the history of the {@link RestDocument} with the given document ID using the given {@link HistoryEntry}.
	 *
	 * @param documentId   The document ID of the {@link RestDocument} to update.
	 * @param historyEntry The {@link HistoryEntry} to update the contained values for.
	 * @return The updated {@link HistoryEntry}.
	 * @throws ResultException Shall be thrown, should updating the document history have failed.
	 */
	updateDocumentHistory(documentId: string, historyEntry: HistoryEntry): Promise<HistoryEntry>;

	/**
	 * Updates the security information of a selected document in the server´s document storage.
	 *
	 * @param documentId   The unique documentId of the document in the server´s document storage.
	 * @param passwordType The security information to update the document with
	 * @return The updated {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should updating the document security have failed.
	 */
	updateDocumentSecurity(documentId: string, passwordType: PdfPassword): Promise<T_REST_DOCUMENT>;

	/**
	 * Returns information about the document selected by documentId in the document storage.
	 *
	 * @param documentId   The unique documentId of the document in the server´s document storage.
	 * @param infoType     Detailed information for the document referenced by the unique documentId
	 *                     in the server´s document storage.
	 * @return The requested document {@link Info}
	 * @throws ResultException Shall be thrown, should fetching the document info have failed.
	 */
	getDocumentInfo(documentId: string, infoType: InfoType): Promise<Info>;

	/**
	 * <p>
	 * Extracts the {@link RestDocument} with the given document ID in the document storage.
	 * <ul>
	 * <li>The document referenced by documentId must be a valid archive. If not, the operation will be aborted.</li>
	 * <li>For each file in the archive, a new DocumentFile is created in the document storage with a new documentId.</li>
	 * <li>Each newly created DocumentFile holds as parentDocumentId the documentId of the archive.</li>
	 * </ul>
	 * </p>
	 *
	 * @param documentId   The document ID of the {@link RestDocument} to extract.
	 * @param fileExtract   {@link FileExtract} settings for unpacking the archive document.
	 * @return A list of the extracted {@link RestDocument}s.
	 * @throws ResultException Shall be thrown, should the extraction has failed.
	 */
	extractDocument(documentId: string, fileExtract: FileExtract): Promise<Array<T_REST_DOCUMENT>>;

	/**
	 * Extracts and downloads the given archive path in the {@link RestDocument} with the given document ID and
	 * returns it as {@link Buffer}.
	 *
	 * @param documentId   The document ID of the {@link RestDocument} to extract and download from.
	 * @param archivePath  The path of the file to extract in the given archive.
	 * @return The {@link Buffer} of the extracted and downloaded archive file.
	 * @throws ResultException Shall be thrown, should the download have failed.
	 */
	extractArchiveFile(documentId: string, archivePath: string): Promise<Buffer>;

	/**
	 * <p>
	 * Compresses a list of {@link RestDocument}s selected by documentId or file filter into a new archive document
	 * in the document storage.
	 * <ul>
	 * <li>The list of documents that should be in the archive are selected via the documentId or a file filter.</li>
	 * <li>The selection specifications can be made individually or together and act additively in the order documentId
	 * and then file filter.</li>
	 * <li>If the id is invalid for documents selected via documentId or documents are locked, then the call is aborted
	 * with an error.</li>
	 * <li>The created archive is stored as a new document with a new documentId in the document storage.</li>
	 * </ul>
	 * </p>
	 *
	 * @param fileCompress    The {@link FileCompress} settings for creating the archive document and for selecting
	 * 						  and filtering the documents to be added to the archive.
	 * @return The compressed {@link RestDocument}.
	 * @throws ResultException Shall be thrown, should the compression has failed.
	 */
	compressDocuments(fileCompress: FileCompress): Promise<T_REST_DOCUMENT>;

	/**
	 * Updates a {@link RestDocument} selected by documentId with the given {@link Blob}, updating it in this
	 * {@link DocumentManager} and returns the resulting {@link RestDocument} handle.
	 *
	 * @param documentId The document ID of the {@link RestDocument} to update.
	 * @param data     	 The data {@link Blob} to update the document with.
	 * @return The resulting {@link RestDocument} handle.
	 * @throws ResultException Shall be thrown, should the update have failed.
	 */
	updateDocument(documentId: string, data: Blob): Promise<T_REST_DOCUMENT>;
}
