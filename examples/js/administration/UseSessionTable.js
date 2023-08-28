import {AdministrationManager, SessionContext, SessionFactory, WebServiceProtocol} from "../../../lib";
import {SessionTable} from "../../../src/main/typescript/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link AdministrationManager} demonstrating how you can
 * use the session table of the server using the REST API.
 *
 * <p>
 * This usage example for the webPDF {@link AdministrationManager} shall demonstrate:
 * <ul>
 * <li>how to get the session table</li>
 * <li>close a specific session</li>
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

	try {
		/** Initialize the session with the webPDF Server (using REST): */
		let session = await SessionFactory.createInstance(sessionContext);

		/** Get {@link AdministrationManager} from {@link RestSession} */
		let administrationManager = session.getAdministrationManager();

		/** Get {@link SessionTable} from {@link AdministrationManager} */
		let sessionTable = await administrationManager.getSessionTable();

		/** get the {@link Array<SessionTableEntry>} */
		let sessionTableEntries = sessionTable.sessionList || [];

		/** close a specific session */
		await administrationManager.closeSession(sessionTableEntries[0].sessionId);

		/** restart the server */
		await administrationManager.restart();
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