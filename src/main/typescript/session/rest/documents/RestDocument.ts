import {Document} from "../../documents"
import {DocumentFile, HistoryEntry} from "../../../generated-sources";
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
}
