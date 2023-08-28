import {
	DocumentManager,
	RestDocument,
	RestSession,
	SessionContext,
	SessionFactory,
	WebServiceProtocol
} from "../../../lib";
import {FileCompress, FileExtract} from "../../../lib/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link DocumentManager} demonstrating how you can
 * manage documents from the server using the REST API.
 *
 * <p>
 * This usage example for the webPDF {@link DocumentManager} shall demonstrate:
 * <ul>
 * <li>how to upload a document</li>
 * <li>how to get a list of uploaded</li>
 * <li>how to get a specific uploaded document</li>
 * <li>how to rename a document</li>
 * <li>how to handle the document history</li>
 * <li>how to compress documents</li>
 * <li>how to extract an archive</li>
 * <li>how to delete a document</li>
 * <li>how to download a document</li>
 * </ul>
 *
 * <b>Be aware:</b> You have to adapt the fields of this class accordingly, otherwise this example is not runnable.
 * </p>
 * <p>
 */
async function main() {
	/** Adapt the following fields accordingly: */
	let sourceDocument = document.getElementById("fileinput").files[0];
	let webPDFServerURL = "http://localhost:8080/webPDF/";

	/** Initialize a simple {@link SessionContext}. */
	let sessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

	try {
		/** Initialize the session with the webPDF Server (using REST): */
		let session = await SessionFactory.createInstance(sessionContext);

		/** Get {@link DocumentManager} from {@link RestSession} */
		let documentManager = session.getDocumentManager();

		/** upload file in {@link DocumentManager} */
		await session.uploadDocument(sourceDocument, "filename");

		/** get a list of all currently uploaded {@link RestDocument}s */
		let documents = documentManager.getDocuments();

		/** check if the {@link DocumentManager} has a {@link RestDocument} */
		documentManager.containsDocument("Document id");

		/** get a specific {@link RestDocument} by id */
		let specificDocument = documentManager.getDocument("Document id");

		/** rename a {@link RestDocument} */
		await documentManager.renameDocument(specificDocument.getDocumentId(), "new name");
		/** you can also rename the file directly */
		await specificDocument.renameDocument("new name");

		/** get the {@link List<HistoryEntry>} */
		let historyEntries = documentManager.getDocumentHistory(specificDocument.getDocumentId());
		/** you can also get the document history directly */
		historyEntries = specificDocument.getHistory();

		/** change the active history entry */
		historyEntries[0].active = true;

		/** update a history entry */
		await documentManager.updateDocumentHistory(specificDocument.getDocumentId(), historyEntries[0]);

		/** compress {@link RestDocument}s to an archive */
		let fileCompress = new FileCompress({});

		let documentIdList = [];
		for (let document of documents) {
			documentIdList.push(document.getDocumentId());
		}

		fileCompress.documentIdList = documentIdList;
		fileCompress.archiveFileName = "archive";

		let archiveFile = await documentManager.compressDocuments(fileCompress);

		/** extract all {@link RestDocument}s from an archive */
		let unzippedFiles = await documentManager.extractDocument(
			archiveFile.getDocumentId(), new FileExtract({})
		);
		/** you can also extract the archive directly */
		unzippedFiles = await archiveFile.extractDocument(new FileExtract({}));

		/** delete a {@link RestDocument} from the {@link DocumentManager} */
		await documentManager.deleteDocument(archiveFile.getDocumentId());
		/** you can also delete the document directly */
		await archiveFile.deleteDocument();

		/** download a {@link RestDocument} to {@link File} */
		let downloadedFile = await documentManager.downloadDocument(specificDocument.getDocumentId());
		/** you can also download the file directly */
		downloadedFile = await specificDocument.downloadDocument();
		window.location = window.URL.createObjectURL(new Blob([downloadedFile]));

		await session.close();
	} catch (resultException) {
		/** Should an exception have occurred, you can use the following methods to request further information
		 * about the exception: */
		let errorCode = resultException.getErrorCode();
		let error = resultException.getClientError();
		let message = resultException.getMessage();
		let cause = resultException.getCause();
		let stMessage = resultException.getStackTraceMessage();

		/** Also be aware, that you may use the subtypes {@link ClientResultException},
		 * {@link ServerResultException} and {@link AuthResultException} to differentiate the different failure
		 * sources in your catches. */
	}
}

(function () {
	document.getElementById("start").onclick = main;
})()