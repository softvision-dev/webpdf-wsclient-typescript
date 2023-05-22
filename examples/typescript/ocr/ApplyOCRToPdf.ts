import fs from "fs";
import {OcrWebService, RestDocument, RestSession, ResultException, SessionContext, SessionFactory, WebServiceProtocol, WebServiceTypes, WsclientError} from "../../../src/main/typescript";
import {Metrics, Ocr, OcrInterface, OcrLanguage, OcrOutput, OcrPage} from "../../../src/main/typescript/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link OcrWebService} demonstrating how you can extract text
 * from a document using the REST API.
 */
class ApplyOCRToPdf {
	/**
	 * <p>
	 * This usage example for the webPDF {@link OcrWebService} shall demonstrate:
	 * <ul>
	 * <li>The creation of a simple {@link RestSession}</li>
	 * <li>The creation of a {@link OcrWebService} interface type.</li>
	 * <li>The parameterization required to convert a document to a PDF document.</li>
	 * <li>The handling of the source and result {@link RestDocument} for a {@link RestSession}.</li>
	 * </ul>
	 *
	 * <b>Be aware:</b> You have to adapt the fields of this class accordingly, otherwise this example is not runnable.
	 * </p>
	 */
	public static async main(): Promise<void> {
		/** Adapt the following fields accordingly:
		 * (this is the node variant of reading the file. You could also use the file from an input field in browser here.) */
		let sourceDocument: any = fs.readFileSync("The path to your source file");
		let targetDocument: string = "The path to your target file";
		let webPDFServerURL: string = ("http://localhost:8080/webPDF/");

		/** Initialize a simple {@link SessionContext}. */
		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

		try {
			/** Initialize the session with the webPDF Server (using REST): */
			let session: RestSession<RestDocument> = await SessionFactory.createInstance(sessionContext);

			/** Instantiate the {@link WebService} interface type you want to call.
			 * (using {@link WebServiceTypes.OCR} here): */
			let ocrWebService: OcrWebService<RestDocument> =
				session.createWebServiceInstance(WebServiceTypes.OCR);

			/** Upload your document to the REST sessions´s document storage.
			 * You may upload/download/delete/rename/etc. as many {@link RestDocument}s as you wish and at any time,
			 * and you may want to use the {@link RestSession}´s {@link DocumentManager} to assist you in such a complex
			 * scenario - but for this simple usage example using the following shortcut shall suffice.*/
			let restDocument: RestDocument = await session.uploadDocument(sourceDocument, "filename");

			/** Request the parameter tree root, to begin parameterizing your webservice call: */
			let ocr: Ocr = ocrWebService.getOperationParameters();

			/** Parameterize your webservice call.
			 * For this simple example, we want to extract text contents to a *.txt file.
			 */
			ocr.language = OcrLanguage.Deu;
			ocr.checkResolution = false;
			ocr.forceEachPage = true;
			ocr.imageDpi = 300;
			ocr.outputFormat = OcrOutput.Text;

			/** Searching for text in a 800x600 pixel area of the contained pages */
			let page: OcrPage = new OcrPage({});
			ocr.page = page;
			page.width = 800;
			page.height = 600;
			page.metrics = Metrics.Px;

			/** Or just set the complete parameters as json nodes */
			ocrWebService.setOperationParameters(
				Ocr.fromJson({
					language: OcrLanguage.Deu,
					checkResolution: false,
					forceEachPage: true,
					imageDpi: 300,
					outputFormat: OcrOutput.Text,
					page: {
						width: 800,
						height: 600,
						metrics: Metrics.Px
					}
				} as OcrInterface)
			);

			/** Execute the webservice and download your result document: */
			let resultDocument: RestDocument | undefined = await ocrWebService.process(restDocument);
			let downloadedFile: Buffer = await resultDocument!.downloadDocument();
			/** This is the node variant of writing the file. You could also just download the file contents in browser. */
			fs.writeFileSync(targetDocument, downloadedFile);

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
