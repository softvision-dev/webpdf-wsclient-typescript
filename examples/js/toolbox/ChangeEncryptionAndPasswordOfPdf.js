import {SessionContext, SessionFactory, WebServiceProtocol, WebServiceTypes} from "../../../lib";
import {Encrypt, PasswordEncrypt, PdfEncryptionKey, ToolboxSecurity, ToolboxSecuritySecurity} from "../../../lib/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link ToolboxWebService} demonstrating how you can set an open
 * and permission password for your PDF document using the REST API in a web environment.
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
        let toolboxOperation = new ToolboxSecurity({});
        toolboxWebService.getOperationParameters().push(toolboxOperation);

        /** Initialize and add the security operation: */
        let security = new ToolboxSecuritySecurity({});
        toolboxOperation.security = security;

        /**
         * We first want to set permissions for the protected document, to limit what users - other than the owner -
         * may do with the document.
         */
        let encrypt = new Encrypt({});
        security.encrypt = encrypt;
        encrypt.canAssemble = true;
        encrypt.canExtractContent = true;
        encrypt.canExtractForAccessibility = true;
        encrypt.canFillInForm = true;

        /**
         * Next we want to set the open and permission password.
         */
        let password = new PasswordEncrypt({});
        encrypt.password = password;
        password.encryptionKey = PdfEncryptionKey.AES128;
        password.open = "password";
        password.permission = "password";

        /** Or just set the complete parameters as json nodes */
        toolboxWebService.setOperationParameters([
            ToolboxSecurity.fromJson({
                    security: {
                        encrypt: {
                            canAssemble: true,
                            canExtractContent: true,
                            canExtractForAccessibility: true,
                            canFillInForm: true,
                            password: {
                                encryptionKey: PdfEncryptionKey.AES128,
                                open: "password",
                                permission: "password"
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