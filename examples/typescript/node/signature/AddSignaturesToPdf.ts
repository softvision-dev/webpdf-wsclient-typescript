import fs from "fs";
import {RestDocument, RestSession, ResultException, SessionContext, SessionFactory, SignatureWebService, WebServiceProtocol, WebServiceTypes, WsclientError} from "../../../../src/main/typescript";
import {AddSignature, AppearanceAdd, CertificationLevel, Signature, SignatureFileData, SignatureImage, SignatureInterface, SignaturePosition} from "../../../../src/main/typescript/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link SignatureWebService} demonstrating how you can add a
 * signature to a PDF document using the REST API.
 */
class AddSignaturesToPdf {
	/**
	 * <p>
	 * This usage example for the webPDF {@link SignatureWebService} shall demonstrate:
	 * <ul>
	 * <li>The creation of a simple {@link RestSession}</li>
	 * <li>The creation of a {@link SignatureWebService} interface type.</li>
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
		let signatureImage: string = fs.readFileSync("The path to some image file", {encoding: "base64"}).toString();
		let targetDocument: string = "The path to your target file";
		let webPDFServerURL: string = "http://localhost:8080/webPDF/";

		/** Initialize a simple {@link SessionContext}. */
		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

		try {
			/** Initialize the session with the webPDF Server (using REST): */
			let session: RestSession<RestDocument> = await SessionFactory.createInstance(sessionContext);

			/** Instantiate the {@link WebService} interface type you want to call.
			 * (using {@link WebServiceTypes.SIGNATURE} here): */
			let signatureWebService: SignatureWebService<RestDocument> =
				session.createWebServiceInstance(WebServiceTypes.SIGNATURE);

			/** Upload your document to the REST sessions´s document storage.
			 * You may upload/download/delete/rename/etc. as many {@link RestDocument}s as you wish and at any time,
			 * and you may want to use the {@link RestSession}´s {@link DocumentManager} to assist you in such a complex
			 * scenario - but for this simple usage example using the following shortcut shall suffice.*/
			let restDocument: RestDocument = await session.uploadDocument(sourceDocument, "filename");

			/** Request the parameter tree root, to begin parameterizing your webservice call: */
			let signature: Signature = signatureWebService.getOperationParameters();

			/** Parameterize your webservice call.
			 * For this example, we will entirely prohibit further editing of the document. */
			let add: AddSignature = new AddSignature({});
			signature.add = add;
			add.reason = "webPDF wsclient sample";
			add.location = "Main Street, Anytown, USA";
			add.contact = "Any Company";
			add.certificationLevel = CertificationLevel.NoChanges;
			add.keyName = "Generic self-signed certificate";

			/** Next we shall position our signature on page 1 of the document: */
			let appearance: AppearanceAdd = new AppearanceAdd({});
			add.appearance = appearance;
			appearance.page = 1;
			let position: SignaturePosition = new SignaturePosition({});
			position.x = 5;
			position.y = 5;
			position.width = 80;
			position.height = 15;
			appearance.position = position;

			/** And will then add textual and image contents to the visual appearance: */
			let image: SignatureImage = new SignatureImage({});
			let imageData: SignatureFileData = new SignatureFileData({});
			imageData.value = signatureImage;
			image.data = imageData;
			image.opacity = 40;
			appearance.image = image;
			appearance.identifier = "John Doe";

			/** Or just set the complete parameters as json nodes */
			signatureWebService.setOperationParameters(
				Signature.fromJson({
					add: {
						reason: "webPDF wsclient sample",
						location: "Main Street, Anytown, USA",
						contact: "Any Company",
						certificationLevel: CertificationLevel.NoChanges,
						keyName: "Generic self-signed certificate",
						appearance: {
							page: 1,
							position: {
								x: 5,
								y: 5,
								width: 80,
								height: 15
							},
							image: {
								data: imageData,
								opacity: 40
							},
							identifier: "John Doe"
						}
					}
				} as SignatureInterface)
			);

			/** Execute the webservice and download your result document: */
			let resultDocument: RestDocument | undefined = await signatureWebService.process(restDocument);
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
	await AddSignaturesToPdf.main();
})();