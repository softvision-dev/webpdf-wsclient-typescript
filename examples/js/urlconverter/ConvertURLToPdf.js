import {SessionContext, SessionFactory, WebServiceProtocol, WebServiceTypes} from "../../../lib";
import {UrlConverterPage, Metrics, UrlConverter} from "../../../lib/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link UrlConverterWebService} demonstrating how you can
 * convert a URL to a PDF document using the REST API in a web environment.
 *
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
async function main() {
    /** Adapt the following fields accordingly: */
    let sourceURL = document.getElementById("urlinput").value;
    let webPDFServerURL = "http://localhost:8080/webPDF/";

    /** Initialize a simple {@link SessionContext}. */
    let sessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

    try {
        /** Initialize the session with the webPDF Server (using REST): */
        let session = await SessionFactory.createInstance(sessionContext);

        /** Instantiate the {@link WebService} interface type you want to call.
         * (using {@link WebServiceTypes.URLCONVERTER} here): */
        let urlConverterWebService = session.createWebServiceInstance(WebServiceTypes.URLCONVERTER);

        /** Request the parameter tree root, to begin parameterizing your webservice call: */
        let urlConverter = urlConverterWebService.getOperationParameters();

        /**
         * Parameterize the webservice call.
         * For this example we shall select a URL and shall define the dimensions of the created pages.
         */
        urlConverter.url = sourceURL;
        let page = new UrlConverterPage({});
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
                }
            )
        );

        /** Execute the webservice and download your result document: */
        let resultDocument = await urlConverterWebService.process();
        let downloadedFile = await resultDocument.downloadDocument();
        /** Download the file */
        window.location = window.URL.createObjectURL(new Blob([downloadedFile]));

        await session.close();
    } catch (resultException) {
        console.debug(resultException);

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