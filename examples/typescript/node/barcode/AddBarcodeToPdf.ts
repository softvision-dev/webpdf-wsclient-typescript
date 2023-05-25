import fs from "fs";
import {BarcodeWebService, RestDocument, RestSession, ResultException, SessionContext, SessionFactory, WebServiceProtocol, WebServiceTypes, WsclientError} from "../../../../src/main/typescript";
import {AddBarcode, AztecBarcode, AztecBarcodeInterface, Barcode, BarcodeInterface, Coordinates, Metrics, Rectangle} from "../../../../src/main/typescript/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link BarcodeWebService} demonstrating the creation of a
 * barcode for a PDF document using the REST API.
 */
class AddBarcodeToPdf {
	/**
	 * <p>
	 * This usage example for the webPDF {@link BarcodeWebService} shall demonstrate:
	 * <ul>
	 * <li>The creation of a simple {@link RestSession}</li>
	 * <li>The creation of a {@link BarcodeWebService} interface type.</li>
	 * <li>The parameterization required to add barcodes to pages of a PDF document.</li>
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
		let webPDFServerURL: string = "http://localhost:8080/webPDF/";

		/** Initialize a simple {@link SessionContext}. */
		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

		try {
			/** Initialize the session with the webPDF Server (using REST): */
			let session: RestSession<RestDocument> = await SessionFactory.createInstance(sessionContext);

			/** Instantiate the {@link WebService} interface type you want to call.
			 * (using {@link WebServiceTypes.BARCODE} here): */
			let barcodeWebService: BarcodeWebService<RestDocument> =
				session.createWebServiceInstance(WebServiceTypes.BARCODE);

			/** Upload your document to the REST sessions´s document storage.
			 * You may upload/download/delete/rename/etc. as many {@link RestDocument}s as you wish and at any time,
			 * and you may want to use the {@link RestSession}´s {@link DocumentManager} to assist you in such a complex
			 * scenario - but for this simple usage example using the following shortcut shall suffice.*/
			let restDocument: RestDocument = await session.uploadDocument(sourceDocument, "filename");

			/** Request the parameter tree root, to begin parameterizing your webservice call: */
			let barcode: Barcode = barcodeWebService.getOperationParameters();

			/** Order the webservice to add barcodes to the source document.
			 * You may add multiple barcodes to the hereby created element: */
			let add: AddBarcode = new AddBarcode({});
			barcode.add = add;

			/** Select and parameterize the barcode type, that you want to add to your document. */
			let aztec: AztecBarcode = new AztecBarcode({});
			add.aztec!.push(aztec);
			aztec.charset = "utf-8";
			aztec.margin = 5;
			aztec.pages = "1-5";
			aztec.rotation = 90;
			aztec.value = "http://www.softvision.de";
			aztec.errorCorrection = 50;
			aztec.layers = 10;

			/** Position the barcode on the selected pages: */
			let position: Rectangle = new Rectangle({});
			aztec.position = position;
			position.metrics = Metrics.Px;
			position.x = 15;
			position.y = 20;
			position.width = 50;
			position.height = 50;
			position.coordinates = Coordinates.User;

			/** Or just set the complete parameters as json nodes */
			barcodeWebService.setOperationParameters(
				Barcode.fromJson({
					add: {
						aztec: [
							{
								charset: "utf-8",
								margin: 5,
								pages: "1-5",
								rotation: 90,
								value: "http://www.softvision.de",
								errorCorrection: 50,
								layers: 10,
								position: {
									metrics: Metrics.Px,
									x: 15,
									y: 20,
									width: 100,
									height: 100,
									coordinates: Coordinates.User
								}
							} as AztecBarcodeInterface
						]
					}
				} as BarcodeInterface)
			);

			/** Execute the webservice and download your result document: */
			let resultDocument: RestDocument | undefined = await barcodeWebService.process(restDocument);
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

(async function () {
	await AddBarcodeToPdf.main();
})();