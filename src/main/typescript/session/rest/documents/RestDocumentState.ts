import {RestDocument} from "./RestDocument";
import {DocumentFile, HistoryEntry} from "../../../generated-sources";
import {DocumentManager} from "./DocumentManager";

/**
 * <p>
 * An instance of {@link RestDocumentState} represents the internal state of a {@link RestDocument},
 * that has been uploaded to a webPDF server.
 * </p>
 * <p>
 * The {@link RestDocumentState} allows a {@link RestDocument} to access and publish the state, without violating the
 * exclusive update rights of the {@link DocumentManager}.<br>
 * (i.e. The {@link DocumentManager} shall always be the only entity, that is allowed to change the internal state of an
 * uploaded document.)
 * </p>
 */
export interface RestDocumentState<T_DOCUMENT extends RestDocument> {
	/**
	 * Returns the document ID of the managed {@link RestWebServiceDocument}.
	 *
	 * @return The document ID of the managed {@link RestWebServiceDocument}.
	 */
	getDocumentId(): string

	/**
	 * Returns the {@link DocumentFile} of the managed {@link RestWebServiceDocument}.
	 *
	 * @return The {@link DocumentFile} of the managed {@link RestWebServiceDocument}.
	 */
	getDocumentFile(): DocumentFile

	/**
	 * Sets the {@link DocumentFile} of the managed {@link RestWebServiceDocument}.
	 *
	 * @param documentFile the new {@link DocumentFile} of the managed {@link RestWebServiceDocument}.
	 */
	setDocumentFile(documentFile: DocumentFile): void;

	/**
	 * Returns the {@link HistoryEntry}s of the managed {@link RestWebServiceDocument}.
	 *
	 * @return The {@link HistoryEntry}s of the managed {@link RestWebServiceDocument}.
	 */
	getHistory(): Array<HistoryEntry>

	/**
	 * Replaces the internally stored {@link HistoryEntry} list of the managed {@link RestDocument}
	 *
	 * @param historyEntries The new {@link HistoryEntry}s to be set.
	 * @throws ResultException Shall be thrown, when updating the document history failed.
	 */
	setHistory(historyEntries: Array<HistoryEntry>): void

	/**
	 * Returns a {@link HistoryEntry} from the internal history map, by given history ID.
	 *
	 * @param historyId The history ID of the {@link HistoryEntry} that shall be returned.
	 * @return A {@link HistoryEntry} representing a historic state of the uploaded resource.
	 * @throws ResultException Shall be thrown, should accessing the document history fail.
	 */
	getHistoryEntry(historyId: number): HistoryEntry;

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
	 * Returns the currently active {@link HistoryEntry}.
	 *
	 * @return The currently active {@link HistoryEntry}.
	 * @throws ResultException Shall be thrown, when updating the document history failed.
	 */
	activeHistory(): HistoryEntry;

	/**
	 * Returns the owning {@link DocumentManager}.
	 *
	 * @return The owning {@link DocumentManager}.
	 */
	getDocumentManager(): DocumentManager<T_DOCUMENT>;
}
