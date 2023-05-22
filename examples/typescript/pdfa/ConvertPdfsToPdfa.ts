import fs from "fs";
import {PdfaWebService, RestDocument, RestSession, ResultException, SessionContext, SessionFactory, WebServiceProtocol, WebServiceTypes, WsclientError} from "../../../src/main/typescript";
import {ConvertPdfa, Pdfa, PdfaErrorReport, PdfaInterface, PdfaLevel, PdfaSuccessReport} from "../../../src/main/typescript/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link PdfaWebService} demonstrating how you can a PDF document
 * to a PDF/A document using the REST API.<br>
 * <b>Be aware:</b> For this to work your source document must meet the requirements of the PDF/A standard of your
 * choice and not all documents will meet the criteria of each PDF/A conformance level.<br>
 * You should expect failures, should you convert some document, that you did not check for conformance to the
 * standard.<br>
 * (To mention it: The {@link PdfaWebService} can check the PDF/A conformance of a document for you.)
 */
class ConvertPdfsToPdfa {
	/**
	 * <p>
	 * This usage example for the webPDF {@link PdfaWebService} shall demonstrate:
	 * <ul>
	 * <li>The creation of a simple {@link RestSession}</li>
	 * <li>The creation of a {@link PdfaWebService} interface type.</li>
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
			 * (using {@link WebServiceTypes.PDFA} here): */
			let pdfaWebService: PdfaWebService<RestDocument> =
				session.createWebServiceInstance(WebServiceTypes.PDFA);

			/** Upload your document to the REST sessions´s document storage.
			 * You may upload/download/delete/rename/etc. as many {@link RestDocument}s as you wish and at any time,
			 * and you may want to use the {@link RestSession}´s {@link DocumentManager} to assist you in such a complex
			 * scenario - but for this simple usage example using the following shortcut shall suffice.*/
			let restDocument: RestDocument = await session.uploadDocument(sourceDocument, "filename");

			/** Request the parameter tree root, to begin parameterizing your webservice call: */
			let pdfa: Pdfa = pdfaWebService.getOperationParameters();

			/** Parameterize your webservice call.
			 * In this example we want to convert the document to conformance level "3b".
			 */
			let convert: ConvertPdfa = new ConvertPdfa({});
			pdfa.convert = convert;
			convert.level = PdfaLevel._3b;
			convert.imageQuality = 90;

			/**
			 * We want to receive an error report in file form, should our PDF document not meet the conformance
			 * criteria, but don't require a report upon success:
			 */
			convert.successReport = PdfaSuccessReport.None;
			convert.errorReport = PdfaErrorReport.File;

			/** Or just set the complete parameters as json nodes */
			pdfaWebService.setOperationParameters(
				Pdfa.fromJson({
					convert: {
						level: PdfaLevel._3b,
						imageQuality: 90,
						successReport: PdfaSuccessReport.None,
						errorReport: PdfaErrorReport.File
					}
				} as PdfaInterface)
			);

			/** Execute the webservice and download your result document: */
			let resultDocument: RestDocument | undefined = await pdfaWebService.process(restDocument);
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
