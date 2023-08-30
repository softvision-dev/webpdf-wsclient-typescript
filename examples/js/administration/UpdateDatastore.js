import {AdministrationManager, SessionContext, SessionFactory, WebServiceProtocol} from "../../../lib";
import {FileGroupDataStore, LogoFileDataStore} from "../../../src/main/typescript/generated-sources";

/** file to base64 helper */
const toBase64 = file => new Promise((resolve, reject) => {
	const reader = new FileReader();
	reader.readAsDataURL(file);
	reader.onload = () => resolve(reader.result.substring(reader.result.indexOf(',') + 1));
	reader.onerror = reject;
});

/**
 * Here you will find a usage example for the webPDF {@link AdministrationManager} demonstrating how you can
 * update a file in the datastore of the server using the REST API.
 *
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
async function main() {
	/** Adapt the following fields accordingly: */
	let webPDFServerURL = "http://localhost:8080/webPDF/";
	let logoFile = toBase64(document.getElementById("fileinput").files[0]);

	/** Initialize a simple {@link SessionContext}. */
	let sessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

	try {
		/** Initialize the session with the webPDF Server (using REST): */
		let session = await SessionFactory.createInstance(sessionContext);

		/** Get {@link AdministrationManager} from {@link RestSession} */
		let administrationManager = session.getAdministrationManager();

		/** get the currently set logo file */
		let currentLogo = await administrationManager.fetchDatastore(FileGroupDataStore.Logo);

		/**
		 * initialize a {@link LogoFileDataStore} parameter to update with.
		 * Set the file contents and group you want to update. In this example we will update the logo file.
		 */
		let fileDataStore = new LogoFileDataStore({
			fileContent: logoFile,
			fileGroup: FileGroupDataStore.Logo
		});

		/** update the datastore */
		await administrationManager.updateDatastore(fileDataStore);

		/** delete the currently set logo file */
		await administrationManager.deleteDatastore(FileGroupDataStore.Logo);

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