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
import {
	Server,
	TrustStoreKeyStore,
	TrustStoreKeyStoreInterface,
	TruststoreServer,
	TruststoreServerInterface
} from "../../../../src/main/typescript/generated-sources";
import fs from "fs";

/**
 * Here you will find a usage example for the webPDF {@link AdministrationManager} demonstrating how you can
 * update the configuration of the server using the REST API.
 */
class UpdateConfiguration {
	/**
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
	public static async main(): Promise<void> {
		/** Adapt the following fields accordingly:
		 * (this is the node variant of reading the file. You could also use the file from an input field in browser here.) */
		let webPDFServerURL: string = "http://localhost:8080/webPDF/";
		let truststoreFile: any = fs.readFileSync("The path to your source file");

		/** Initialize a simple {@link SessionContext}. */
		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, new URL(webPDFServerURL));
		let userProvider: UserAuthProvider = new UserAuthProvider("admin", "admin");

		try {
			/** Initialize the session with the webPDF Server (using REST): */
			let session: RestSession<RestDocument> = await SessionFactory.createInstance(sessionContext, userProvider);

			/** Get {@link AdministrationManager} from {@link RestSession} */
			let administrationManager: AdministrationManager<RestDocument> = session.getAdministrationManager();

			/** Get {@link Server} from {@link AdministrationManager} */
			let serverConfiguration: Server = await administrationManager.getServerConfiguration();

			/** Get currently set {@link TrustStoreKeyStore} */
			let truststore: TrustStoreKeyStore = await administrationManager.getTrustStoreKeyStore();

			/** Create a new {@link TruststoreServer} to use as Parameter for the update */
			let truststoreServer: TruststoreServer = new TruststoreServer({
				file: "myTrustStore.jks",
				password: "webpdf"
			} as TruststoreServerInterface);

			/** replace the current config with the new values */
			serverConfiguration.truststore = truststoreServer;

			/** create a new {@link TrustStoreKeyStore} */
			truststore = new TrustStoreKeyStore({
				keyStoreContent: truststoreFile
			} as TrustStoreKeyStoreInterface);

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
	await UpdateConfiguration.main();
})();