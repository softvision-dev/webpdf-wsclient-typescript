import {RestDocumentState} from "./RestDocumentState";
import {RestWebServiceDocument} from "./RestWebServiceDocument";
import {DocumentFile, HistoryEntry} from "../../../generated-sources";
import {DocumentManager} from "./DocumentManager";
import {RestWebServiceDocumentManager} from "./RestWebServiceDocumentManager";
import {ClientResultException, WsclientErrors} from "../../../exception";

/**
 * <p>
 * An instance of {@link RestWebServiceDocumentState} represents the internal state of a {@link RestWebServiceDocument},
 * that has been uploaded to a webPDF server.
 * </p>
 * <p>
 * The {@link RestWebServiceDocumentState} allows a
 * {@link RestWebServiceDocument} to access and publish the state, without violating the exclusive update rights of the
 * {@link DocumentManager}.<br>
 * (i.e. The {@link DocumentManager} shall always be the only entity, that is allowed to change the internal state of an
 * uploaded document.)
 * </p>
 */
export class RestWebServiceDocumentState implements RestDocumentState<RestWebServiceDocument> {
    private readonly historyMap: Map<number, HistoryEntry>;
    private readonly _documentManager: DocumentManager<RestWebServiceDocument>;
    private _documentFile: DocumentFile;

    /**
     * Creates a {@link RestWebServiceDocumentState} known to the webPDF server by the given document ID.
     *
     * @param documentFile    The {@link DocumentFile} of the managed {@link RestWebServiceDocument}.
     * @param documentManager The owning {@link DocumentManager}
     */
    public constructor(documentFile: DocumentFile, documentManager: RestWebServiceDocumentManager) {
        this.historyMap = new Map<number, HistoryEntry>();
        this._documentFile = documentFile;
        this._documentManager = documentManager as DocumentManager<RestWebServiceDocument>;
    }

    /**
     * Returns the document ID of the managed {@link RestWebServiceDocument}.
     *
     * @return The document ID of the managed {@link RestWebServiceDocument}.
     */
    public getDocumentId(): string {
        return this.getDocumentFile().documentId;
    }

    /**
     * Returns the {@link DocumentFile} of the managed {@link RestWebServiceDocument}.
     *
     * @return The {@link DocumentFile} of the managed {@link RestWebServiceDocument}.
     */
    public getDocumentFile(): DocumentFile {
        return this._documentFile;
    }

    /**
     * Sets the {@link DocumentFile} of the managed {@link RestWebServiceDocument}.
     *
     * @param documentFile the new {@link DocumentFile} of the managed {@link RestWebServiceDocument}.
     */
    public setDocumentFile(documentFile: DocumentFile): void {
        this._documentFile = documentFile;
    }

    /**
     * Returns the {@link HistoryEntry}s of the managed {@link RestWebServiceDocument}.
     *
     * @return The {@link HistoryEntry}s of the managed {@link RestWebServiceDocument}.
     */
    public getHistory(): Array<HistoryEntry> {
        return Array.from(this.historyMap.values());
    }

    /**
     * Replaces the internally stored {@link HistoryEntry} list of the managed {@link RestDocument}
     *
     * @param historyEntries The new {@link HistoryEntry}s to be set.
     * @throws ResultException Shall be thrown, when updating the document history failed.
     */
    public setHistory(historyEntries: Array<HistoryEntry>): void {
        this.historyMap.clear();

        for (let historyEntry of historyEntries) {
            this.updateHistoryEntry(historyEntry);
        }
    }

    /**
     * Returns a {@link HistoryEntry} from the internal history map, by given history ID.
     *
     * @param historyId The history ID of the {@link HistoryEntry} that shall be returned.
     * @return A {@link HistoryEntry} representing a historic state of the uploaded resource.
     * @throws ResultException Shall be thrown, should accessing the document history fail.
     */
    public getHistoryEntry(historyId: number): HistoryEntry {
        if (!this.historyMap.has(historyId)) {
            throw new ClientResultException(WsclientErrors.INVALID_HISTORY_DATA);
        }

        return this.historyMap.get(historyId)!;
    }

    /**
     * Updates the given {@link HistoryEntry} in the internally managed document history.
     *
     * @param historyEntry The {@link HistoryEntry} containing the values to be set.
     * @throws ResultException Shall be thrown, when updating the document history failed.
     */
    public updateHistoryEntry(historyEntry: HistoryEntry): void {
        let historyId: number = historyEntry.id;

        // disable active state for all entries, because the new entry is active
        if (historyEntry.active) {
            for (let entry of this.historyMap.values()){
                entry.active = false;
            }
        }

        this.historyMap.set(historyId, historyEntry);
    }

    /**
     * Returns the most recent {@link HistoryEntry}.
     *
     * @return The most recent {@link HistoryEntry}.
     * @throws ResultException Shall be thrown, when updating the document history failed.
     */
    public lastHistory(): HistoryEntry {
        if (this.historyMap.size === 0) {
            throw new ClientResultException(WsclientErrors.INVALID_HISTORY_DATA);
        }

        return Array.from(this.historyMap.values()).pop()!;
    }

    /**
     * Returns the number of known {@link HistoryEntry}s for this {@link RestWebServiceDocument}.
     *
     * @return The number of known {@link HistoryEntry}s for this {@link RestWebServiceDocument}.
     */
    public getHistorySize(): number {
        return this.historyMap.size;
    }

    /**
     * Returns the currently active {@link HistoryEntry}.
     *
     * @return The currently active {@link HistoryEntry}.
     * @throws ResultException Shall be thrown, when updating the document history failed.
     */
    public activeHistory(): HistoryEntry {
        if (this.historyMap.size === 0) {
            throw new ClientResultException(WsclientErrors.INVALID_HISTORY_DATA);
        }

        return Array.from(this.historyMap.values()).find((entry: HistoryEntry) => {
            return entry.active === true
        })!;
    }

    /**
     * Returns the owning {@link DocumentManager}.
     *
     * @return The owning {@link DocumentManager}.
     */
    public getDocumentManager(): DocumentManager<RestWebServiceDocument> {
        return this._documentManager;
    }
}
