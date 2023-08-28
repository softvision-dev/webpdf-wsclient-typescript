import {AdministrationManager, SessionContext, SessionFactory, WebServiceProtocol} from "../../../lib";

/**
 * Here you will find a usage example for the webPDF {@link AdministrationManager} demonstrating how you can
 * update the configuration of the server using the REST API.
 *
 * <p>
 * This usage example for the webPDF {@link AdministrationManager} shall demonstrate:
 * <ul>
 * <li>how to get a configuration</li>
 * <li>how to update the configuration</li>
 * <li>how to fetch the updated configuration</li>
 * <li>how to remove the updated configuration values</li>
 * </ul>
 *
 * <b>Be aware:</b> You have to adapt the fields of this class accordingly, otherwise this example is not runnable.
 * </p>
 * <p>
 */
async function main() {
	/** Adapt the following fields accordingly: */
	let webPDFServerURL = "http://localhost:8080/webPDF/";
	let truststoreFile = document.getElementById("fileinput").files[0];

	/** Initialize a simple {@link SessionContext}. */
	let sessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));

	try {
		/** Initialize the session with the webPDF Server (using REST): */
		let session = await SessionFactory.createInstance(sessionContext);

		/** Get {@link AdministrationManager} from {@link RestSession} */
		let administrationManager = session.getAdministrationManager();

		/** Get {@link Server} from {@link AdministrationManager} */
		let serverConfiguration = await administrationManager.getServerConfiguration();

		/** Get currently set {@link TrustStoreKeyStore} */
		let truststore = await administrationManager.getTrustStoreKeyStore();

		/** Create a new {@link TruststoreServer} to use as Parameter for the update */
		let truststoreServer = new TruststoreServer({
			file: "myTrustStore.jks",
			password: "webpdf"
		});

		/** replace the current config with the new values */
		serverConfiguration.truststore = truststoreServer;

		/** create a new {@link TrustStoreKeyStore} */
		truststore = new TrustStoreKeyStore({
			keyStoreContent: truststoreFile
		});

		/** update the {@link TrustStoreKeyStore} and {@link Server} in the {@link AdministrationManager} */
		administrationManager.setTrustStoreKeyStore(truststore);
		await administrationManager.updateServerConfiguration(serverConfiguration);

		/**
		 * fetch the newly set configuration and keystore from server
		 * <b>note: getServerConfiguration would only return the old configuration not the updated one.</b>
		 */
		serverConfiguration = await administrationManager.fetchServerConfiguration();
		truststore = await administrationManager.fetchTrustStoreKeyStore();

		/** remove the keystore from configuration */
		serverConfiguration.truststore = undefined;
		truststore.keyStoreContent = undefined;
		await administrationManager.updateServerConfiguration(serverConfiguration);

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