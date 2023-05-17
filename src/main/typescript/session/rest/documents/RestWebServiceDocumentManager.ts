import {RestWebServiceDocument} from "./RestWebServiceDocument";
import {AbstractDocumentManager} from "./AbstractDocumentManager";
import {RestSession} from "../RestSession";
import {RestWebServiceDocumentState} from "./RestWebServiceDocumentState";
import {DocumentManager} from "./DocumentManager";
import {DocumentFile} from "../../../generated-sources";

/**
 * An instance of {@link RestWebServiceDocumentManager} allows to monitor and interact with the
 * {@link RestWebServiceDocument}s uploaded to a {@link RestSession} of the webPDF server.
 */
export class RestWebServiceDocumentManager extends AbstractDocumentManager<RestWebServiceDocument>
	implements DocumentManager<RestWebServiceDocument> {
	/**
	 * Initializes a {@link RestWebServiceDocumentManager} for the given {@link RestSession}.
	 *
	 * @param session The {@link RestSession} a {@link RestWebServiceDocumentManager} shall be created for.
	 */
	public constructor(session: RestSession<RestWebServiceDocument>) {
		super(session);
	}

	/**
	 * Creates a new {@link RestWebServiceDocument} for the given document {@link documentFile}.
	 *
	 * @param documentFile The {@link documentFile} a matching {@link RestWebServiceDocument} shall be created for.
	 * @return The created {@link RestWebServiceDocument}.
	 */
	protected createDocument(documentFile: DocumentFile): RestWebServiceDocument {
		return new RestWebServiceDocument(new RestWebServiceDocumentState(documentFile, this));
	}

	/**
	 * Requests access to the internal {@link RestDocumentState}.
	 *
	 * @param document The {@link RestDocument} to request access for.
	 * @return The internal {@link RestDocumentState}.
	 */
	protected accessInternalState(document: RestWebServiceDocument): RestWebServiceDocumentState {
		return document.accessInternalState();
	}
}
