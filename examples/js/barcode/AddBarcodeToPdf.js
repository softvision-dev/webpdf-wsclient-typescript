import {SessionContext, SessionFactory, WebServiceProtocol, WebServiceTypes} from "../../../lib";
import {AddBarcode, AztecBarcode, Rectangle, Metrics, Coordinates, Barcode} from "../../../lib/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link BarcodeWebService} demonstrating the creation of a
 * barcode for a PDF document using the REST API in a web environment.
 *
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
async function main() {
    /** Adapt the following fields accordingly: */
    let sourceDocument = document.getElementById("fileinput").files[0];
    let webPDFServerURL = "http://localhost:8080/webPDF/";

    /** Initialize a simple {@link SessionContext}. */
    let sessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

    try {
        /** Initialize the session with the webPDF Server (using REST): */
        let session = await SessionFactory.createInstance(sessionContext);

        /** Instantiate the {@link WebService} interface type you want to call.
         * (using {@link WebServiceTypes.BARCODE} here): */
        let barcodeWebService = session.createWebServiceInstance(WebServiceTypes.BARCODE);

        /** Upload your document to the REST sessions´s document storage.
         * You may upload/download/delete/rename/etc. as many {@link RestDocument}s as you wish and at any time,
         * and you may want to use the {@link RestSession}´s {@link DocumentManager} to assist you in such a complex
         * scenario - but for this simple usage example using the following shortcut shall suffice.*/
        let restDocument = await session.uploadDocument(sourceDocument, "filename");

        /** Request the parameter tree root, to begin parameterizing your webservice call: */
        let barcode = barcodeWebService.getOperationParameters();

        /** Order the webservice to add barcodes to the source document.
         * You may add multiple barcodes to the hereby created element: */
        let add = new AddBarcode({});
        barcode.add = add;

        /** Select and parameterize the barcode type, that you want to add to your document. */
        let aztec = new AztecBarcode({});
        add.aztec.push(aztec);
        aztec.charset = "utf-8";
        aztec.margin = 5;
        aztec.pages = "1-5";
        aztec.rotation = 90;
        aztec.value = "http://www.softvision.de";
        aztec.errorCorrection = 50;
        aztec.layers = 10;

        /** Position the barcode on the selected pages: */
        let position = new Rectangle({});
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
                            }
                        ]
                    }
                }
            )
        );

        /** Execute the webservice and download your result document: */
        let resultDocument = await barcodeWebService.process(restDocument);
        let downloadedFile = await resultDocument.downloadDocument();
        /** Download the file */
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