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
import {FileGroupDataStore, LogoFileDataStore} from "../../../../src/main/typescript/generated-sources";
import fs from "fs";

/**
 * Here you will find a usage example for the webPDF {@link AdministrationManager} demonstrating how you can
 * update a file in the datastore of the server using the REST API.
 */
class UpdateDatastore {
	/**
	 * <p>
	 * This usage example for the webPDF {@link AdministrationManager} shall demonstrate:
	 * <ul>
	 * <li>how to get a file from the datastore</li>
	 * <li>how to replace a file in the datastore</li>
	 * <li>how to delete a file from the datastore</li>
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
		let logoFile: any = fs.readFileSync("The path to your source file");

		/** Initialize a simple {@link SessionContext}. */
		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));
		let userProvider: UserAuthProvider = new UserAuthProvider("admin", "admin");

		try {
			/** Initialize the session with the webPDF Server (using REST): */
			let session: RestSession<RestDocument> = await SessionFactory.createInstance(sessionContext, userProvider);

			/** Get {@link AdministrationManager} from {@link RestSession} */
			let administrationManager: AdministrationManager<RestDocument> = session.getAdministrationManager();

			/** get the currently set logo file */
			let currentLogo: LogoFileDataStore = await administrationManager.fetchDatastore(
				FileGroupDataStore.Logo
			) as LogoFileDataStore;

			/**
			 * initialize a {@link LogoFileDataStore} parameter to update with.
			 * Set the file contents and group you want to update. In this example we will update the logo file.
			 */
			let fileDataStore: LogoFileDataStore = new LogoFileDataStore({
				fileContent: logoFile.toString("base64"),
				fileGroup: FileGroupDataStore.Logo
			});

			/** update the datastore */
			await administrationManager.updateDatastore(fileDataStore);

			/** delete the currently set logo file */
			await administrationManager.deleteDatastore(FileGroupDataStore.Logo);

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

(async function (): Promise<void> {
	await UpdateDatastore.main();
})();