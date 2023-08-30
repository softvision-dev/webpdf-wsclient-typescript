import {
	AdministrationManager,
	RestDocument,
	RestSession,
	ResultException,
	SessionContext,
	SessionFactory,
	UserAuthProvider,
	WebServiceProtocol,
	WsclientError
} from "../../../../src/main/typescript";
import {ServerStatus} from "../../../../src/main/typescript/generated-sources";

/**
 * Here you will find a usage example for the webPDF {@link AdministrationManager} demonstrating how you can
 * get status information about the server using the REST API.
 */
class GetServerStatus {
	/**
	 * <p>
	 * This usage example for the webPDF {@link AdministrationManager} shall demonstrate:
	 * <ul>
	 * <li>retrieving the {@link ServerStatus} about the server</li>
	 * </ul>
	 *
	 * <b>Be aware:</b> You have to adapt the fields of this class accordingly, otherwise this example is not runnable.
	 * </p>
	 * <p>
	 */
	public static async main(): Promise<void> {
		/** Adapt the following fields accordingly:
		 * (this is the node variant of reading the file. You could also use the file from an input field in browser here.) */
		let webPDFServerURL: string = "http://localhost:8080/webPDF/";

		/** Initialize a simple {@link SessionContext}. */
		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));
		let userProvider: UserAuthProvider = new UserAuthProvider("admin", "admin");

		try {
			/** Initialize the session with the webPDF Server (using REST): */
			let session: RestSession<RestDocument> = await SessionFactory.createInstance(sessionContext, userProvider);

			/** Get {@link AdministrationManager} from {@link RestSession} */
			let administrationManager: AdministrationManager<RestDocument> = session.getAdministrationManager();

			/** Get {@link ServerStatus} from {@link AdministrationManager} */
			let serverStatus: ServerStatus = await administrationManager.fetchServerStatus();

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
	await GetServerStatus.main();
})();