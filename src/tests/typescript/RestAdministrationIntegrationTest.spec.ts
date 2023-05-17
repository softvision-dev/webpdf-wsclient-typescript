import {expect} from 'chai';
import {ServerType, TestConfig, TestResources, TestServer} from "./testsuite";
import {AuthMaterial, RestDocument, RestSession, SessionContext, SessionFactory, UserAuthProvider, WebServiceProtocol, wsclientConfiguration} from "../../main/typescript";
import {
	AggregationServerState,
	Application,
	ApplicationCheck,
	ApplicationCheckMode,
	ApplicationConfigKeystore,
	ApplicationConfigKeystoreInterface,
	ApplicationConfigPortalUserInterface,
	ApplicationConfigPortalUserInterfaceInterface,
	ConfigurationResult,
	ConnectorKeyStore,
	DataSourceServerState,
	ExecutableName,
	FileGroupDataStore,
	GlobalKeyStore,
	GlobalKeystoreFormat,
	KeystoreSSL,
	License,
	LogConfigurationMode,
	LogFileConfiguration,
	LogoFileDataStore,
	LogoFileDataStoreInterface,
	Server,
	ServerStatus,
	SessionTable,
	SSLKeystoreFormat,
	Statistic,
	TrustStoreKeyStore,
	TrustStoreKeyStoreInterface,
	TruststoreServer,
	TruststoreServerInterface,
	User,
	Users,
	Webservice,
	WebserviceStatus
} from "../../main/typescript/generated-sources";

wsclientConfiguration.FormData = require("form-data");
wsclientConfiguration.btoa = function (data: string) {
	return Buffer.from(data).toString('base64');
};
const atob = function (data: string) {
	return Buffer.from(data, "base64").toString("ascii");
};

describe("RestAdministrationIntegrationTest", function () {
	let testServer: TestServer = new TestServer();
	let testResources: TestResources = new TestResources('documents');
	let testKeystores: TestResources = new TestResources('keystore');

	it('testUser', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		// Anonymous
		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL))
		);

		try {
			await session.getAdministrationManager().getApplicationConfiguration();
		} catch (e: any) {
			expect(e, "The configuration should not be readable by anonymous").to.not.be.undefined;
		}

		await session.close();

		// User
		session = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider("user", "user")
		);

		try {
			await session.getAdministrationManager().getApplicationConfiguration();
		} catch (e: any) {
			expect(e, "The configuration should not be readable by user").to.not.be.undefined;
		}

		await session.close();

		// Admin
		session = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		try {
			await session.getAdministrationManager().getApplicationConfiguration();
		} catch (e: any) {
			expect(e, "The configuration should be readable by administrator").to.be.undefined;
		}

		await session.close();
	});

	it('testUserConfig', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let userConfig: Users = await session.getAdministrationManager().getUserConfiguration();
		expect(userConfig, "User configuration should exist.").to.exist;
		expect(userConfig.user, "The user list should exist.").to.exist;
		expect(userConfig.user!.length, "There should be 2 users.").to.equal(2);

		userConfig.user!.push({
			username: "tester",
			password: "password"
		} as User);

		try {
			await session.getAdministrationManager().updateUserConfiguration(userConfig);
		} catch (ex: any) {
			expect(ex, "The user update did not work").to.be.undefined;
		}

		userConfig = await session.getAdministrationManager().fetchUserConfiguration();
		expect(userConfig, "User configuration should exist.").to.exist;
		expect(userConfig.user!.length, "There should be 3 users.").to.equal(3);

		// reset users
		let users: Array<User> = userConfig.user!;
		for (let [key, user] of users.entries()) {
			if (user.username === "tester") {
				users.splice(key, 1);
				break;
			}
		}

		userConfig.user = users;
		await session.getAdministrationManager().updateUserConfiguration(userConfig);

		await session.close();
	});

	it('testLogsConfig', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let logConfig: LogFileConfiguration = await session.getAdministrationManager().getLogConfiguration();
		expect(logConfig, "Log configuration should exist.").to.exist;

		logConfig.debugMode = LogConfigurationMode.Debug;

		try {
			await session.getAdministrationManager().updateLogConfiguration(logConfig);
		} catch (ex: any) {
			expect(ex, "The log update did not work").to.be.undefined;
		}

		logConfig = await session.getAdministrationManager().fetchLogConfiguration();
		expect(logConfig, "Log configuration should exist.").to.exist;
		expect(logConfig.debugMode, "Debug mode should be active.").to.equal(LogConfigurationMode.Debug);

		// reset debug mode
		logConfig.debugMode = LogConfigurationMode.None;
		await session.getAdministrationManager().updateLogConfiguration(logConfig);

		await session.close();
	});

	it('testServerConfig', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let serverConfig: Server = await session.getAdministrationManager().getServerConfiguration();
		expect(serverConfig, "Server configuration should exist.").to.exist;
		expect(serverConfig.host.name, "Host name should be localhost.").to.equal("localhost");

		serverConfig.host.name = "custom";

		try {
			await session.getAdministrationManager().updateServerConfiguration(serverConfig);
		} catch (ex: any) {
			expect(ex, "The server update did not work").to.be.undefined;
		}

		serverConfig = await session.getAdministrationManager().fetchServerConfiguration();
		expect(serverConfig, "Server configuration should exist.").to.exist;
		expect(serverConfig.host.name, "Host name should be custom.").to.equal("custom");

		// reset host name
		serverConfig.host.name = "localhost";
		await session.getAdministrationManager().updateServerConfiguration(serverConfig);

		await session.close();
	});

	it('testApplicationConfig', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let applicationConfig: Application = await session.getAdministrationManager().getApplicationConfiguration();
		expect(applicationConfig, "Application configuration should exist.").to.exist;
		expect(applicationConfig.portal.userInterface, "UserInterface should exist.").to.exist;

		applicationConfig.portal.userInterface = new ApplicationConfigPortalUserInterface({
			limits: {
				displayDiskSpace: true
			}
		} as ApplicationConfigPortalUserInterfaceInterface);
		expect(applicationConfig.portal.userInterface, "UserInterface should exist.").to.exist;
		expect(applicationConfig.portal.userInterface!.limits, "Limits should exist.").to.exist;
		expect(applicationConfig.portal.userInterface!.limits!.displayDiskSpace, "DisplayDiskSpace should be true.").to.equal(true);

		try {
			await session.getAdministrationManager().updateApplicationConfiguration(applicationConfig);
		} catch (ex: any) {
			expect(ex, "The server update did not work").to.be.undefined;
		}

		applicationConfig = await session.getAdministrationManager().fetchApplicationConfiguration();
		expect(applicationConfig, "Application configuration should exist.").to.exist;
		expect(applicationConfig.portal.userInterface, "UserInterface should exist.").to.exist;
		expect(applicationConfig.portal.userInterface!.limits, "Limits should exist.").to.exist;
		expect(applicationConfig.portal.userInterface!.limits!.displayDiskSpace, "DisplayDiskSpace should be true.").to.equal(true);

		// reset displayDiskSpace
		applicationConfig.portal.userInterface!.limits = undefined;
		await session.getAdministrationManager().updateApplicationConfiguration(applicationConfig);

		await session.close();
	});

	it('validateApplication', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let applicationConfig: Application = await session.getAdministrationManager().getApplicationConfiguration();
		expect(applicationConfig, "Application configuration should exist.").to.exist;

		applicationConfig.license = License.fromJson({
			licensee: TestConfig.instance.getIntegrationTestConfig().getLicensee(),
			key: TestConfig.instance.getIntegrationTestConfig().getLicenseKey()
		});

		try {
			let result: ConfigurationResult = await session.getAdministrationManager().validateApplicationConfiguration(
				applicationConfig, [
					ApplicationCheck.fromJson({
						checkType: ApplicationCheckMode.License
					} as ApplicationCheck)
				]);

			expect(result.error!.code, "No error expected").to.equal(0);
		} catch (ex: any) {
			expect(ex, "The server validation did not work").to.be.undefined;
		}

		await session.close();
	});

	it('validateApplicationException', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let applicationConfig: Application = await session.getAdministrationManager().getApplicationConfiguration();
		expect(applicationConfig, "Application configuration should exist.").to.exist;

		try {
			let result: ConfigurationResult = await session.getAdministrationManager().validateApplicationConfiguration(
				applicationConfig, [
					ApplicationCheck.fromJson({
						checkType: ApplicationCheckMode.Tsa
					} as ApplicationCheck)
				]);

			expect(result.error!.code, "Tsa error expected").to.equal(-34);
		} catch (ex: any) {
			expect(ex, "The server validation did not work").to.be.undefined;
		}

		await session.close();
	});

	it('validateApplicationExecutables', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let applicationConfig: Application = await session.getAdministrationManager().getApplicationConfiguration();
		expect(applicationConfig, "Application configuration should exist.").to.exist;

		try {
			let result: ConfigurationResult = await session.getAdministrationManager().testExecutables(applicationConfig, [
				ExecutableName.OutsideIn,
				ExecutableName.Pdftools
			]);

			expect(result.error!.code, "No error expected").to.equal(0);
		} catch (ex: any) {
			expect(ex, "The server validation did not work").to.be.undefined;
		}

		try {
			let result: ConfigurationResult = await session.getAdministrationManager().testExecutables(applicationConfig, [
				ExecutableName.OutsideIn,
				ExecutableName.Pdftools,
				ExecutableName.OfficeBridge
			]);

			expect(result.error!.code, "Unable to find 'officebridge.exe' error expected.").to.equal(-47);
		} catch (ex: any) {
			expect(ex, "The server validation did not work").to.be.undefined;
		}

		await session.close();
	});

	it('testServerStatus', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		try {
			let serverStatus: ServerStatus = await session.getAdministrationManager().getStatus();
			expect(serverStatus.webservices!.toolbox, "Webservice toolbox should exist.").to.exist;
			expect(serverStatus.webservices!.toolbox.status, "Webservice status should be ok.").to.equal(WebserviceStatus.Ok);
		} catch (ex: any) {
			expect(ex, "The server request did not work").to.be.undefined;
		}

		await session.close();
	});

	it('testStreamLog', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		try {
			let logLength: number = await session.getAdministrationManager().getLogLength();
			let result: string = await session.getAdministrationManager().getLog("0-" + logLength);
			expect(result, "Log should exist.").to.exist;
			expect(result.length, "Content size should be > 0.").to.be.greaterThan(0);
		} catch (ex: any) {
			expect(ex, "The server request did not work").to.be.undefined;
		}

		await session.close();
	});

	it('testAdministrationSupportInformation', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		try {
			let result: Buffer = await session.getAdministrationManager().getSupport();
			expect(result, "Result should exist").to.exist;
			expect(result.byteLength, "Content size should be > 0.").to.be.greaterThan(0);
		} catch (ex: any) {
			expect(ex, "The server request did not work").to.be.undefined;
		}

		await session.close();
	});

	it('testAdministrationDatastore', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let logoFilename: string = "logo.png";
		let logoFile: Buffer = testResources.getResource(logoFilename) as Buffer;

		let fileDataStore: LogoFileDataStore = LogoFileDataStore.fromJson({
			fileContent: logoFile.toString("base64"),
			fileGroup: FileGroupDataStore.Logo
		} as LogoFileDataStoreInterface);

		try {
			let currentLogo: LogoFileDataStore =
				await session.getAdministrationManager().getDatastore(FileGroupDataStore.Logo) as LogoFileDataStore;
			expect(
				currentLogo.fileContent, "Content of uploaded logo file should be different to local file."
			).to.not.equal(fileDataStore.fileContent);

			await session.getAdministrationManager().updateDatastore(fileDataStore);
			currentLogo = await session.getAdministrationManager().getDatastore(FileGroupDataStore.Logo) as LogoFileDataStore;
			expect(
				currentLogo.fileContent, "Content of uploaded logo file should be identical to local file."
			).to.equal(fileDataStore.fileContent);

			await session.getAdministrationManager().deleteDatastore(FileGroupDataStore.Logo);
			currentLogo = await session.getAdministrationManager().getDatastore(FileGroupDataStore.Logo) as LogoFileDataStore;
			expect(
				currentLogo.fileContent, "Content of uploaded logo file should be different to local file."
			).to.not.equal(fileDataStore.fileContent);
		} catch (ex: any) {
			expect(ex, "The server request did not work").to.be.undefined;
		}

		await session.close();
	});

	it('testAdministrationTruststore', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let truststoreFilename: string = "myTrustStore.jks";
		let truststoreFile: Buffer = testKeystores.getResource(truststoreFilename) as Buffer;

		let serverConfig: Server = await session.getAdministrationManager().getServerConfiguration();
		expect(serverConfig, "Server configuration should exist.").to.exist;
		expect(serverConfig.truststore, "Truststore should not exist.").to.not.exist;

		let truststore: TrustStoreKeyStore = await session.getAdministrationManager().getTrustStoreKeyStore();
		expect(truststore.keyStoreContent, "Truststore content should be empty.").to.be.empty;

		serverConfig.truststore = TruststoreServer.fromJson({
			file: truststoreFilename,
			password: "webpdf"
		} as TruststoreServerInterface);
		truststore = TrustStoreKeyStore.fromJson({
			keyStoreContent: truststoreFile.toString("base64")
		} as TrustStoreKeyStoreInterface);

		try {
			session.getAdministrationManager().setTrustStoreKeyStore(truststore);
			await session.getAdministrationManager().updateServerConfiguration(serverConfig);
		} catch (ex: any) {
			expect(ex, "The server update did not work").to.be.undefined;
		}

		serverConfig = await session.getAdministrationManager().fetchServerConfiguration();
		expect(serverConfig, "Application configuration should exist.").to.exist;
		expect(serverConfig.truststore, "Truststore should exist.").to.exist;

		truststore = await session.getAdministrationManager().fetchTrustStoreKeyStore();
		expect(truststore, "Truststore should exist.").to.exist;

		// reset keystore
		serverConfig.truststore = undefined;
		truststore!.keyStoreContent = undefined;
		await session.getAdministrationManager().updateServerConfiguration(serverConfig);

		await session.close();
	});

	it('testAdministrationKeystore', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let signatureFilename: string = "signatureKeyStore.jks";
		let signatureFile: Buffer = testKeystores.getResource(signatureFilename) as Buffer;

		let applicationConfig: Application = await session.getAdministrationManager().getApplicationConfiguration();
		expect(applicationConfig, "Application configuration should exist.").to.exist;
		expect(applicationConfig.keystore!.type, "Keystore type should be NONE.").to.equal(GlobalKeystoreFormat.NONE);

		let globalKeyStore: GlobalKeyStore = await session.getAdministrationManager().getGlobalKeyStore();
		expect(globalKeyStore.keyStoreContent, "Keystore content should be empty.").to.be.empty;

		applicationConfig.keystore = ApplicationConfigKeystore.fromJson({
			type: GlobalKeystoreFormat.JKS,
			password: "webpdf"
		} as ApplicationConfigKeystoreInterface);
		globalKeyStore = GlobalKeyStore.fromJson({
			keyStoreContent: signatureFile.toString("base64")
		} as GlobalKeyStore);

		try {
			session.getAdministrationManager().setGlobalKeyStore(globalKeyStore);
			await session.getAdministrationManager().updateApplicationConfiguration(applicationConfig);
		} catch (ex: any) {
			expect(ex, "The server update did not work").to.be.undefined;
		}

		expect(applicationConfig, "Application configuration should exist.").to.exist;
		expect(applicationConfig.keystore, "Keystore should exist.").to.exist;

		globalKeyStore = await session.getAdministrationManager().fetchGlobalKeyStore();
		expect(globalKeyStore, "Keystore should exist.").to.exist;

		// reset keystore
		applicationConfig.keystore!.type = GlobalKeystoreFormat.NONE;
		globalKeyStore!.keyStoreContent = undefined;
		await session.getAdministrationManager().updateApplicationConfiguration(applicationConfig);

		globalKeyStore = await session.getAdministrationManager().fetchGlobalKeyStore();
		expect(globalKeyStore.keyStoreContent, "Keystore content should be empty.").to.be.empty;

		await session.close();
	});

	it('testSslConnectionKeystore', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let sslKeystoreFilename: string = "sslKeyStore.jks";
		let sslKeystoreFile: Buffer = testKeystores.getResource(sslKeystoreFilename) as Buffer;

		let serverConfig: Server = await session.getAdministrationManager().getServerConfiguration();
		expect(serverConfig, "Server configuration should exist.").to.exist;
		expect(serverConfig.connectors.connector![1].ssl!.keystore.file, "Keystore should be default.").to.equal("ssl.jks");

		let connectorKeyStores: { [key: string]: ConnectorKeyStore; } = await session.getAdministrationManager().getConnectorKeyStore();
		expect(connectorKeyStores["ssl.jks"], "Default keystore should exist.").to.exist;
		expect(connectorKeyStores["ssl.jks"].certificates?.length, "Keystore certificates should exist.").to.be.greaterThan(0);

		serverConfig.connectors.connector![1].ssl!.keystore = KeystoreSSL.fromJson({
			type: SSLKeystoreFormat.JKS,
			file: sslKeystoreFilename,
			password: "webpdf"
		} as KeystoreSSL);

		connectorKeyStores[sslKeystoreFilename] = ConnectorKeyStore.fromJson({
			keyStoreContent: sslKeystoreFile.toString("base64")
		} as ConnectorKeyStore);

		try {
			session.getAdministrationManager().setConnectorKeyStore(connectorKeyStores);
			await session.getAdministrationManager().updateServerConfiguration(serverConfig);
		} catch (ex: any) {
			expect(ex, "The server update did not work").to.be.undefined;
		}

		expect(serverConfig, "Server configuration should exist.").to.exist;
		expect(serverConfig.connectors.connector![1].ssl!.keystore, "Keystore should exist.").to.exist;

		connectorKeyStores = await session.getAdministrationManager().fetchConnectorKeyStore();
		expect(connectorKeyStores[sslKeystoreFilename], "New keystore should exist.").to.exist;
		expect(connectorKeyStores[sslKeystoreFilename].certificates?.length, "Keystore certificates should exist.").to.be.greaterThan(0);

		// reset keystore
		serverConfig.connectors.connector![1].ssl!.keystore.type = SSLKeystoreFormat.JKS;
		serverConfig.connectors.connector![1].ssl!.keystore.file = "ssl.jks";
		delete connectorKeyStores[sslKeystoreFilename];
		session.getAdministrationManager().setConnectorKeyStore(connectorKeyStores);
		await session.getAdministrationManager().updateServerConfiguration(serverConfig);

		await session.close();
	});

	it('testAdministrationStatistics', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let currentDate: Date = new Date();
		let yesterday: Date = new Date();
		yesterday.setDate(currentDate.getDate() - 1);

		try {
			let result: Statistic = await session.getAdministrationManager().getStatistic(
				DataSourceServerState.Realtime, AggregationServerState.Month,
				[Webservice.Converter], yesterday, currentDate
			);

			expect(result, "There should be statistics").to.exist;
			expect(result.data?.converter, "There should be converter data").to.exist;
		} catch (ex: any) {
			expect(ex, "The server request did not work").to.be.undefined;
		}

		await session.close();
	});

	it('testAdministrationSessions', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let authMaterial: AuthMaterial = await session.getAuthProvider().provide(session);
		let jwtToken: any = JSON.parse(atob(authMaterial.getToken().split(".")[1]));

		let sessionId: string = jwtToken.sub;
		let sessions: SessionTable | undefined;

		try {
			sessions = await session.getAdministrationManager().getSessionTable();
		} catch (ex: any) {
			expect(ex, "The server request did not work").to.be.undefined;
		}

		expect(sessions, "There should be a session table").to.exist;
		expect(sessions!.activeSessions, "There should be at least 1 active session").to.be.greaterThan(0);
		expect(sessions!.sessionList, "There should be a session list").to.exist;

		expect(sessions!.sessionList!.find((value) => {
			return value.sessionId === sessionId;
		}), "The admin session should exist").to.exist;

		// close own session via administration
		try {
			await session.getAdministrationManager().closeSession(sessionId!);
		} catch (ex: any) {
			expect(ex, "The server request did not work").to.be.undefined;
		}

		await session.close();
	});
});