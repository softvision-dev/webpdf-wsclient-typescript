import fs from "fs";
import {RestDocument, RestSession, ResultException, SessionContext, SessionFactory, UrlConverterWebService, WebServiceProtocol, WebServiceTypes, WsclientError} from "../../../../src/main/typescript";
import {Metrics, UrlConverter, UrlConverterInterface, UrlConverterPage} from "../../../../src/main/typescript/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link UrlConverterWebService} demonstrating how you can
 * convert a URL to a PDF document using the REST API.
 */
class ConvertURLToPdf {
	/**
	 * <p>
	 * This usage example for the webPDF {@link UrlConverterWebService} shall demonstrate:
	 * <ul>
	 * <li>The creation of a simple {@link RestSession}</li>
	 * <li>The creation of a {@link UrlConverterWebService} interface type.</li>
	 * <li>The parameterization required to convert a URL to a PDF document.</li>
	 * <li>The handling of the source and result {@link RestDocument} for a {@link RestSession}.</li>
	 * </ul>
	 *
	 * <b>Be aware:</b> You have to adapt the fields of this class accordingly, otherwise this example is not runnable.
	 * </p>
	 */
	public static async main(): Promise<void> {
		/** Adapt the following fields accordingly:
		 * (this is the node variant of reading the file. You could also use the file from an input field in browser here.) */
		let sourceURL: any = fs.readFileSync("Some URL to convert");
		let targetDocument: string = "The path to your target file";
		let webPDFServerURL: string = "http://localhost:8080/webPDF/";

		/** Initialize a simple {@link SessionContext}. */
		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

		try {
			/** Initialize the session with the webPDF Server (using REST): */
			let session: RestSession<RestDocument> = await SessionFactory.createInstance(sessionContext);

			/** Instantiate the {@link WebService} interface type you want to call.
			 * (using {@link WebServiceTypes.URLCONVERTER} here): */
			let urlConverterWebService: UrlConverterWebService<RestDocument> =
				session.createWebServiceInstance(WebServiceTypes.URLCONVERTER);

			/** Request the parameter tree root, to begin parameterizing your webservice call: */
			let urlConverter: UrlConverter = urlConverterWebService.getOperationParameters();

			/**
			 * Parameterize the webservice call.
			 * For this example we shall select a URL and shall define the dimensions of the created pages.
			 */
			urlConverter.url = sourceURL;
			let page: UrlConverterPage = new UrlConverterPage({});
			urlConverter.page = page;
			page.metrics = Metrics.Mm;
			page.width = 800;
			page.height = 600;
			page.top = 10;
			page.right = 15;
			page.bottom = 10;
			page.left = 15;

			/** Or just set the complete parameters as json nodes */
			urlConverterWebService.setOperationParameters(
				UrlConverter.fromJson({
					url: sourceURL,
					page: {
						metrics: Metrics.Mm,
						width: 800,
						height: 600,
						top: 10,
						right: 15,
						bottom: 10,
						left: 15
					}
				} as UrlConverterInterface)
			);

			/** Execute the webservice and download your result document: */
			let resultDocument: RestDocument | undefined = await urlConverterWebService.process();
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

(async function (): Promise<void> {
	await ConvertURLToPdf.main();
})();