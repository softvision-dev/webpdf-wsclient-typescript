import {SessionContext, SessionFactory, WebServiceProtocol, WebServiceTypes} from "../../../lib";
import {Metrics, ToolboxWatermarkWatermark, WatermarkFont, WatermarkText, ToolboxWatermark, WatermarkPosition, WatermarkPositionMode} from "../../../lib/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link ToolboxWebService} demonstrating how you can add a
 * watermark to a PDF document using the REST API in a web environment.
 *
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
         * (using {@link WebServiceTypes.TOOLBOX} here): */
        let toolboxWebService = session.createWebServiceInstance(WebServiceTypes.TOOLBOX);

        /** Upload your document to the REST sessions´s document storage.
         * You may upload/download/delete/rename/etc. as many {@link RestDocument}s as you wish and at any time,
         * and you may want to use the {@link RestSession}´s {@link DocumentManager} to assist you in such a complex
         * scenario - but for this simple usage example using the following shortcut shall suffice.*/
        let restDocument = await session.uploadDocument(sourceDocument, "filename");

        /** Initialize and add a toolbox parameter root: */
        let toolboxOperation = new ToolboxWatermark({});
        toolboxWebService.getOperationParameters().push(toolboxOperation);

        /** Initialize and add the watermark operation: */
        let watermark = new ToolboxWatermarkWatermark({});
        toolboxOperation.watermark = watermark;

        /** Parameterize your webservice call by setting the presentation and contents of the watermark: */
        watermark.pages = "1,3-5,6";
        watermark.angle = 66;
        let text = new WatermarkText({});
        watermark.text = text;
        let font = new WatermarkFont({});
        text.font = font;
        font.opacity = 35;
        font.name = "FontName";
        font.bold = true;
        font.color = "#FFFFFF";
        font.italic = true;
        font.outline = true;
        font.size = 12;

        /**
         * Select a position for the watermark:
         */
        let position = new WatermarkPosition({});
        text.position = position;
        position.x = 15;
        position.y = -6;
        position.width = 200;
        position.height = 16;
        position.metrics = Metrics.Px;
        position.position = WatermarkPositionMode.BottomRight;
        position.aspectRatio = false;

        /** Or just set the complete parameters as json nodes */
        toolboxWebService.setOperationParameters([
            ToolboxWatermark.fromJson({
                    watermark: {
                        pages: "1,3-5,6",
                        angle: 66,
                        text: {
                            font: {
                                opacity: 35,
                                name: "FontName",
                                bold: true,
                                color: "#FFFFFF",
                                italic: true,
                                outline: true,
                                size: 12
                            },
                            position: {
                                x: 15,
                                y: 0,
                                width: 200,
                                height: 16,
                                metrics: Metrics.Px,
                                position: WatermarkPositionMode.BottomRight,
                                aspectRatio: false
                            }
                        }
                    }
                }
            )
        ]);

        /** Execute the webservice and download your result document: */
        let resultDocument = await toolboxWebService.process(restDocument);
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