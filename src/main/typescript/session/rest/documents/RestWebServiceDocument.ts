import {AbstractDocument} from "../../documents";
import {RestDocument} from "./RestDocument";
import {RestWebServiceDocumentState} from "./RestWebServiceDocumentState";
import {DocumentFile, HistoryEntry} from "../../../generated-sources";
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
     * This is a shortcut for {@link DocumentManager#downloadDocument} and
     * Attempts to download and write the {@link RestDocument} to the returned {@link Buffer}.
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
}
