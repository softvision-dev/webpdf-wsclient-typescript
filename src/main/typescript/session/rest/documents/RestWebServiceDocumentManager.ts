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
	 * @inheritDoc
	 */
	protected createDocument(documentFile: DocumentFile): RestWebServiceDocument {
		return new RestWebServiceDocument(new RestWebServiceDocumentState(documentFile, this));
	}

	/**
	 * @inheritDoc
	 */
	protected accessInternalState(document: RestWebServiceDocument): RestWebServiceDocumentState {
		return document.accessInternalState();
	}
}
