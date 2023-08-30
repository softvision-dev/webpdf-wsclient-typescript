import {
	AdministrationManager,
	SessionContext,
	SessionFactory,
	UserAuthProvider,
	WebServiceProtocol
} from "../../../lib";

/**
 * Here you will find a usage example for the webPDF {@link AdministrationManager} demonstrating how you can
 * get the log contents of the server using the REST API.
 *
 * <p>
 * This usage example for the webPDF {@link AdministrationManager} shall demonstrate:
 * <ul>
 * <li>retrieving the log contents from the server</li>
 * </ul>
 *
 * <b>Be aware:</b> You have to adapt the fields of this class accordingly, otherwise this example is not runnable.
 * </p>
 * <p>
 */
async function main() {
	/** Adapt the following fields accordingly: */
	let webPDFServerURL = "http://localhost:8080/webPDF/";

	/** Initialize a simple {@link SessionContext}. */
	let sessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));
	let userProvider = new UserAuthProvider("admin", "admin");

	try {
		/** Initialize the session with the webPDF Server (using REST): */
		let session = await SessionFactory.createInstance(sessionContext, userProvider);

		/** Get {@link AdministrationManager} from {@link RestSession} */
		let administrationManager = session.getAdministrationManager();

		/** Get the current length of the log */
		let logLength = await administrationManager.fetchLogLength();

		/** Get the contents of the current log from byte 0 to log length */
		let logContents = await administrationManager.fetchLog("0-" + logLength);

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