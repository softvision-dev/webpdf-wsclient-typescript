import fs from "fs";
import {
	DocumentManager,
	RestDocument,
	RestSession,
	ResultException,
	SessionContext,
	SessionFactory,
	WebServiceProtocol,
	WsclientError,
} from "../../../../src/main/typescript";
import {FileCompress, FileExtract, HistoryEntry} from "../../../../src/main/typescript/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link DocumentManager} demonstrating how you can
 * manage documents from the server using the REST API.
 */
class UseDocumentManager {
	/**
	 * <p>
	 * This usage example for the webPDF {@link DocumentManager} shall demonstrate:
	 * <ul>
	 * <li>how to upload a document</li>
	 * <li>how to get a list of uploaded</li>
	 * <li>how to get a specific uploaded document</li>
	 * <li>how to rename a document</li>
	 * <li>how to download a document</li>
	 * <li>how to handle the document history</li>
	 * <li>how to compress documents</li>
	 * <li>how to extract an archive</li>
	 * <li>how to delete a document</li>
	 * </ul>
	 *
	 * <b>Be aware:</b> You have to adapt the fields of this class accordingly, otherwise this example is not runnable.
	 * </p>
	 * <p>
	 */
	public static async main(): Promise<void> {
		/** Adapt the following fields accordingly:
		 * (this is the node variant of reading the file. You could also use the file from an input field in browser here.) */
		let sourceDocument: any = fs.readFileSync("The path to your source file");
		let targetDocument: string = "The path to your target file";
		let webPDFServerURL: string = "http://localhost:8080/webPDF/";

		/** Initialize a simple {@link SessionContext}. */
		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

		try {
			/** Initialize the session with the webPDF Server (using REST): */
			let session: RestSession<RestDocument> = await SessionFactory.createInstance(sessionContext);

			/** Get {@link DocumentManager} from {@link RestSession} */
			let documentManager: DocumentManager<RestDocument> = session.getDocumentManager();

			/** upload file in {@link DocumentManager} */
			await session.uploadDocument(sourceDocument, "filename");

			/** get a list of all currently uploaded {@link RestDocument}s */
			let documents: Array<RestDocument> = documentManager.getDocuments();

			/** check if the {@link DocumentManager} has a {@link RestDocument} */
			documentManager.containsDocument("Document id");

			/** get a specific {@link RestDocument} by id */
			let specificDocument: RestDocument = documentManager.getDocument("Document id");

			/** rename a {@link RestDocument} */
			await documentManager.renameDocument(specificDocument.getDocumentId(), "new name");
			/** you can also rename the file directly */
			await specificDocument.renameDocument("new name");

			/** download a {@link RestDocument} to {@link File} */
			let downloadedFile: Buffer = await documentManager.downloadDocument(specificDocument.getDocumentId());
			/** you can also download the file directly */
			downloadedFile = await specificDocument.downloadDocument();
			fs.writeFileSync(targetDocument, downloadedFile);

			/** get the {@link List<HistoryEntry>} */
			let historyEntries: Array<HistoryEntry> = documentManager.getDocumentHistory(specificDocument.getDocumentId());
			/** you can also get the document history directly */
			historyEntries = specificDocument.getHistory();

			/** change the active history entry */
			historyEntries[0].active = true;

			/** update a history entry */
			await documentManager.updateDocumentHistory(specificDocument.getDocumentId(), historyEntries[0]);

			/** compress {@link RestDocument}s to an archive */
			let fileCompress: FileCompress = new FileCompress({});

			let documentIdList: Array<string> = [];
			for (let document of documents) {
				documentIdList.push(document.getDocumentId());
			}

			fileCompress.documentIdList = documentIdList;
			fileCompress.archiveFileName = "archive";

			let archiveFile: RestDocument = await documentManager.compressDocuments(fileCompress);

			/** extract all {@link RestDocument}s from an archive */
			let unzippedFiles: Array<RestDocument> = await documentManager.extractDocument(
				archiveFile.getDocumentId(), new FileExtract({})
			);
			/** you can also extract the archive directly */
			unzippedFiles = await archiveFile.extractDocument(new FileExtract({}));

			/** delete a {@link RestDocument} from the {@link DocumentManager} */
			await documentManager.deleteDocument(archiveFile.getDocumentId());
			/** you can also delete the document directly */
			await archiveFile.deleteDocument();

			await session.close();
		} catch (ex: any) {
			let resultException: ResultException = ex;

			/** Should an exception have occurred, you can use the following methods to request further information
			 * about the exception: */
			let errorCode: number = resultException.getErrorCode();
			let error: WsclientError = resultException.getClientError();
			let message: string = resultException.getMessage();
			let cause: Error | undefined = resultException.getCause();
			let stMessage: string | undefined = resultException.getStackTraceMessage();

			/** Also be aware, that you may use the subtypes {@link ClientResultException},
			 * {@link ServerResultException} and {@link AuthResultException} to differentiate the different failure
			 * sources in your catches. */
		}
	}
}

(async function () {
	await UseDocumentManager.main();
})();