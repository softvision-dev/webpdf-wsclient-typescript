import {SessionContext, SessionFactory, WebServiceProtocol, WebServiceTypes} from "../../../lib";
import {Metrics, OcrLanguage, OcrOutput, OcrPage, Ocr} from "../../../lib/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link OcrWebService} demonstrating how you can extract text
 * from a document using the REST API in a web environment.
 *
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
         * (using {@link WebServiceTypes.OCR} here): */
        let ocrWebService = session.createWebServiceInstance(WebServiceTypes.OCR);

        /** Upload your document to the REST sessions´s document storage.
         * You may upload/download/delete/rename/etc. as many {@link RestDocument}s as you wish and at any time,
         * and you may want to use the {@link RestSession}´s {@link DocumentManager} to assist you in such a complex
         * scenario - but for this simple usage example using the following shortcut shall suffice.*/
        let restDocument = await session.uploadDocument(sourceDocument, "filename");

        /** Request the parameter tree root, to begin parameterizing your webservice call: */
        let ocr = ocrWebService.getOperationParameters();

        /** Parameterize your webservice call.
         * For this simple example, we want to extract text contents to a *.txt file.
         */
        ocr.language = OcrLanguage.Deu;
        ocr.checkResolution = false;
        ocr.forceEachPage = true;
        ocr.imageDpi = 300;
        ocr.outputFormat = OcrOutput.Text;

        /** Searching for text in a 800x600 pixel area of the contained pages */
        let page = new OcrPage({});
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
                }
            )
        );

        /** Execute the webservice and download your result document: */
        let resultDocument = await ocrWebService.process(restDocument);
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