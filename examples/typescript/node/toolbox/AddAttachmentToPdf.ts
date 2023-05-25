import fs from "fs";
import {RestDocument, RestSession, ResultException, SessionContext, SessionFactory, ToolboxWebService, WebServiceProtocol, WebServiceTypes, WsclientError} from "../../../../src/main/typescript";
import {
	AddToolboxAttachment,
	AttachmentFileData,
	Coordinates,
	FileAnnotation,
	FileAttachment,
	FileAttachmentInterface,
	FileDataSource,
	Icons,
	Metrics,
	Point,
	ToolboxAttachment,
	ToolboxAttachmentAttachment,
	ToolboxAttachmentInterface
} from "../../../../src/main/typescript/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link ToolboxWebService} demonstrating how you can add an
 * attachment to a PDF document using the REST API.
 */
class AddAttachmentToPdf {
	/**
	 * <p>
	 * This usage example for the webPDF {@link ToolboxWebService} shall demonstrate:
	 * <ul>
	 * <li>The creation of a simple {@link RestSession}</li>
	 * <li>The creation of a {@link ToolboxWebService} interface type.</li>
	 * <li>The parameterization required to add a markup annotation to a PDF document.</li>
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
		let attachmentToAdd: string = fs.readFileSync("The path to some attachable file", {encoding: "base64"}).toString();
		let targetDocument: string = "The path to your target file";
		let webPDFServerURL: string = "http://localhost:8080/webPDF/";

		/** Initialize a simple {@link SessionContext}. */
		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

		try {
			/** Initialize the session with the webPDF Server (using REST): */
			let session: RestSession<RestDocument> = await SessionFactory.createInstance(sessionContext);

			/** Instantiate the {@link WebService} interface type you want to call.
			 * (using {@link WebServiceTypes.TOOLBOX} here): */
			let toolboxWebService: ToolboxWebService<RestDocument> =
				session.createWebServiceInstance(WebServiceTypes.TOOLBOX);

			/** Upload your document to the REST sessions´s document storage.
			 * You may upload/download/delete/rename/etc. as many {@link RestDocument}s as you wish and at any time,
			 * and you may want to use the {@link RestSession}´s {@link DocumentManager} to assist you in such a complex
			 * scenario - but for this simple usage example using the following shortcut shall suffice.*/
			let restDocument: RestDocument = await session.uploadDocument(sourceDocument, "filename");

			/** Initialize and add a toolbox parameter root: */
			let toolboxOperation: ToolboxAttachment = new ToolboxAttachment({});
			toolboxWebService.getOperationParameters().push(toolboxOperation);

			/** Initialize and add the attachment operation: */
			let attachment: ToolboxAttachmentAttachment = new ToolboxAttachmentAttachment({});
			toolboxOperation.attachment = attachment;

			/** Parameterize your webservice call:
			 * Prepare the file attachment to add. */
			let add: AddToolboxAttachment = new AddToolboxAttachment({});
			attachment.add = add;
			let fileAttachment: FileAttachment = new FileAttachment({});
			add.file!.push(fileAttachment);
			fileAttachment.fileName = "attachment filename";
			let data: AttachmentFileData = new AttachmentFileData({});
			fileAttachment.data = data;
			data.source = FileDataSource.Value;
			data.value = attachmentToAdd;

			/** Define a visual appearance for the attachment: */
			let annotation: FileAnnotation = new FileAnnotation({});
			fileAttachment.annotation = annotation;
			annotation.page = 1;
			annotation.color = "#FFFFFF";
			annotation.opacity = 60;
			annotation.icon = Icons.PushPin;
			annotation.lockedPosition = false;
			annotation.popupText = "The attachment´s description";

			/** Position the annotation on the selected page: */
			let point: Point = new Point({});
			annotation.point = point;
			point.x = 15;
			point.y = 20;
			point.coordinates = Coordinates.User;
			point.metrics = Metrics.Px;

			/** Or just set the complete parameters as json nodes */
			toolboxWebService.setOperationParameters([
				ToolboxAttachment.fromJson({
					attachment: {
						add: {
							file: [
								{
									fileName: "attachment filename",
									data: {
										source: FileDataSource.Value,
										value: attachmentToAdd
									},
									annotation: {
										page: 1,
										color: "#FFFFFF",
										opacity: 60,
										icon: Icons.PushPin,
										lockedPosition: false,
										popupText: "The attachment´s description",
										point: {
											x: 15,
											y: 20,
											coordinates: Coordinates.User,
											metrics: Metrics.Px
										}
									}
								} as FileAttachmentInterface
							]
						}
					}
				} as ToolboxAttachmentInterface)
			]);

			/** Execute the webservice and download your result document: */
			let resultDocument: RestDocument | undefined = await toolboxWebService.process(restDocument);
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
	await AddAttachmentToPdf.main();
})();