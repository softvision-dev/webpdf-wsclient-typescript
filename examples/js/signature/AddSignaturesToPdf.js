import {SessionContext, SessionFactory, WebServiceProtocol, WebServiceTypes} from "../../../lib";
import {AddSignature, AppearanceAdd, CertificationLevel, Signature, SignatureFileData, SignatureImage, SignaturePosition} from "../../../lib/generated-sources";

/** file to base64 helper */
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.substring(reader.result.indexOf(',') + 1));
    reader.onerror = reject;
});

/**
 * Here you will find a usage example for the webPDF {@link SignatureWebService} demonstrating how you can add a
 * signature to a PDF document using the REST API in a web environment.
 *
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
async function main() {
    /** Adapt the following fields accordingly: */
    let sourceDocument = document.getElementById("fileinput").files[0];
    let signatureImage = await toBase64(document.getElementById("imageinput").files[0]);
    let webPDFServerURL = "http://localhost:8080/webPDF/";

    /** Initialize a simple {@link SessionContext}. */
    let sessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

    try {
        /** Initialize the session with the webPDF Server (using REST): */
        let session = await SessionFactory.createInstance(sessionContext);

        /** Instantiate the {@link WebService} interface type you want to call.
         * (using {@link WebServiceTypes.SIGNATURE} here): */
        let signatureWebService = session.createWebServiceInstance(WebServiceTypes.SIGNATURE);

        /** Upload your document to the REST sessions´s document storage.
         * You may upload/download/delete/rename/etc. as many {@link RestDocument}s as you wish and at any time,
         * and you may want to use the {@link RestSession}´s {@link DocumentManager} to assist you in such a complex
         * scenario - but for this simple usage example using the following shortcut shall suffice.*/
        let restDocument = await session.uploadDocument(sourceDocument, "filename");

        /** Request the parameter tree root, to begin parameterizing your webservice call: */
        let signature = signatureWebService.getOperationParameters();

        /** Parameterize your webservice call.
         * For this example, we will entirely prohibit further editing of the document. */
        let add = new AddSignature({});
        signature.add = add;
        add.reason = "webPDF wsclient sample";
        add.location = "Main Street, Anytown, USA";
        add.contact = "Any Company";
        add.certificationLevel = CertificationLevel.NoChanges;
        add.keyName = "Generic self-signed certificate";

        /** Next we shall position our signature on page 1 of the document: */
        let appearance = new AppearanceAdd({});
        add.appearance = appearance;
        appearance.page = 1;
        let position = new SignaturePosition({});
        position.x = 5;
        position.y = 5;
        position.width = 80;
        position.height = 15;
        appearance.position = position;

        /** And will then add textual and image contents to the visual appearance: */
        let image = new SignatureImage({});
        let imageData = new SignatureFileData({});
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
                                data: {
                                    value: signatureImage
                                },
                                opacity: 40
                            },
                            identifier: "John Doe"
                        }
                    }
                }
            )
        );

        /** Execute the webservice and download your result document: */
        let resultDocument = await signatureWebService.process(restDocument);
        let downloadedFile = await resultDocument.downloadDocument();
        /** Download the file */
        window.location = window.URL.createObjectURL(new Blob([downloadedFile]));

        await session.close();
    } catch (resultException) {
        /** Should an exception have occurred, you can use the following methods to request further information
         * about the exception: */
        // let errorCode = resultException.getErrorCode();
        // let error = resultException.getClientError();
        // let message = resultException.getMessage();
        // let cause = resultException.getCause();
        // let stMessage = resultException.getStackTraceMessage();

        /** Also be aware, that you may use the subtypes {@link ClientResultException},
         * {@link ServerResultException} and {@link AuthResultException} to differentiate the different failure
         * sources in your catches. */
    }
}

(function () {
    document.getElementById("start").onclick = main;
})()