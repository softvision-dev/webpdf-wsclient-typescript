import {RestDocument} from "../documents";
import {RestSession} from "../RestSession";
import {
	AggregationServerState,
	Application,
	ApplicationCheck,
	ApplicationCheckMode,
	ApplicationConfiguration,
	ApplicationConfigurationInterface,
	ConfigurationMode,
	ConfigurationResult,
	ConfigurationType,
	ConnectorKeyStore,
	DataSourceServerState,
	ExecutableApplicationCheckInterface,
	ExecutableName,
	FileDataStore,
	FileGroupDataStore,
	GlobalKeyStore,
	LogCheck,
	LogConfiguration,
	LogConfigurationInterface,
	LogFileConfiguration,
	Parameter,
	Server,
	ServerCheck,
	ServerConfiguration,
	ServerConfigurationInterface,
	ServerStatus,
	SessionTable,
	Statistic,
	SupportEntryGroup,
	TrustStoreKeyStore,
	UserCheck,
	UserConfiguration,
	UserConfigurationInterface, UserCredentials,
	Users,
	Webservice
} from "../../../generated-sources";
import {DataFormats} from "../../DataFormat";
import {ClientResultException, WsclientErrors} from "../../../exception";
import {AdministrationManager} from "./AdministrationManager";
import {HttpHeaders, HttpMethod, HttpRestRequest} from "../../connection";
import {AxiosProgressEvent, AxiosResponse} from "axios";

/**
 * An instance of {@link AdministrationManager} allows to administrate the webPDF server.
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} used by the currently active {@link RestSession}.
 */
export abstract class AbstractAdministrationManager<T_REST_DOCUMENT extends RestDocument>
	implements AdministrationManager<T_REST_DOCUMENT> {
	private readonly session: RestSession<T_REST_DOCUMENT>;
	private applicationConfiguration?: Application;
	private serverConfiguration?: Server;
	private userConfiguration?: Users;
	private logConfiguration?: LogFileConfiguration;
	private globalKeyStore?: GlobalKeyStore;
	private connectorKeyStore?: { [key: string]: ConnectorKeyStore; };
	private trustStoreKeyStore?: TrustStoreKeyStore;

	/**
	 * Initializes a {@link AdministrationManager} for the given {@link RestSession}.
	 *
	 * @param session The {@link RestSession} a {@link AdministrationManager} shall be created for.
	 */
	public constructor(session: RestSession<T_REST_DOCUMENT>) {
		this.session = session;
	}

	/**
	 * Returns the {@link RestSession} used by this {@link AdministrationManager}.
	 *
	 * @return The {@link RestSession} used by this {@link AdministrationManager}.
	 */
	public getSession(): RestSession<T_REST_DOCUMENT> {
		return this.session;
	}

	/**
	 * Validates if the current user has access rights and throws {@link ClientResultException} otherwise
	 *
	 * @throws ResultException Shall be thrown upon invalid user access.
	 */
	protected async validateUser(): Promise<void> {
		let user: UserCredentials = await this.session.getUser();

		if (!user.isAdmin) {
			throw new ClientResultException(WsclientErrors.ADMIN_PERMISSION_ERROR);
		}
	}

	/**
	 * Returns the byte size of the current log or a specific log file of the server. If the date query parameter
	 * is specified, an explicitly selected log will be read.
	 *
	 * @param date The date (yyyy-MM-dd) of a specific searched log
	 * @return number the length of the requested log
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchLogLength(date?: string): Promise<number> {
		await this.validateUser();

		let searchParams: URLSearchParams = new URLSearchParams();
		if (typeof date !== "undefined") {
			searchParams.set("date", date);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAcceptHeader(DataFormats.ANY.getMimeType())
			.buildRequest(HttpMethod.HEAD, this.session.getURL("admin/server/log", searchParams));

		let response: AxiosResponse = await request.execute();

		let contentLength: number = 0;
		if (typeof response.headers[HttpHeaders.CONTENT_LENGTH.toLowerCase()] !== "undefined") {
			contentLength = response.headers[HttpHeaders.CONTENT_LENGTH.toLowerCase()] as number;
		}

		return contentLength;
	}

	/**
	 * Returns the contents of the current log or a specific log file of the server. If the date query parameter
	 * is specified, an explicitly selected log will be read.
	 *
	 * @param range A specific optional byte range (e.g. 0-1024) to extract from the server log
	 * @param date A specific optional date (yyyy-MM-dd) to extract from the server log
	 * @return number The contents of the current log or a specific log file of the server
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchLog(range?: string, date?: string): Promise<string> {
		await this.validateUser();

		let searchParams: URLSearchParams = new URLSearchParams();
		if (typeof date !== "undefined") {
			searchParams.set("date", date);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAcceptHeader(DataFormats.PLAIN.getMimeType())
			.setAdditionalHeader(HttpHeaders.RANGE, "bytes=" + (range || "0-"))
			.buildRequest(HttpMethod.GET, this.session.getURL("admin/server/log", searchParams));

		return await request.executeRequest();
	}

	/**
	 * Provides status information about the server, the JVM and the Web services.
	 *
	 * @return {@link ServerStatus} The status information about the server.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchServerStatus(): Promise<ServerStatus> {
		await this.validateUser();

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL("admin/server/status"));

		return ServerStatus.fromJson(await request.executeRequest());
	}

	/**
	 * Collects a set of support information, that may simplify finding the cause and solution of issues.
	 *
	 * @param group   List of components to be included in the support information.
	 * @param start   Start date (yyyy-MM-dd) from when the logs will be included (if logs is included in group).
	 * 				  If empty, then current date.
	 * @param end 	  End date (yyyy-MM-dd) until when the logs will be included (if logs is included in group).
	 * 				  If empty, then current date.
	 * @param options Additional request options - see {@link HttpRestRequest}.
	 * @return {@link Buffer} The support files, that have been collected as a ZIP archive.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async buildSupportPackage(group?: Array<SupportEntryGroup>, start?: string, end?: string, options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<Buffer> {
		await this.validateUser();

		let searchParams: URLSearchParams = new URLSearchParams();

		if (typeof group !== "undefined") {
			for (let groupItem of group) {
				searchParams.append("group", groupItem);
			}
		}

		if (typeof start !== "undefined") {
			searchParams.set("start", start);
		}

		if (typeof end !== "undefined") {
			searchParams.set("end", end);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAcceptHeader(DataFormats.OCTET_STREAM.getMimeType())
			.setAbortSignal(options?.abortSignal)
			.setOnDownloadProgress(options?.onProgress)
			.buildRequest(HttpMethod.GET, this.session.getURL("admin/server/support", searchParams));

		return await request.executeRequest();
	}

	/**
	 * Restarts the server.
	 *
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async restartServer(): Promise<void> {
		await this.validateUser();

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL("admin/server/restart"));

		await request.executeRequest();
	}

	/**
	 * Gets the {@link Application} configuration from the server updating the cached configuration.
	 *
	 * @return {@link Application} the requested configuration.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchApplicationConfiguration(): Promise<Application> {
		await this.validateUser();

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL("admin/configuration/application"));

		let applicationConfiguration: ApplicationConfiguration = ApplicationConfiguration.fromJson(
			await request.executeRequest()
		);

		this.applicationConfiguration = applicationConfiguration.configuration;
		this.globalKeyStore = applicationConfiguration.globalKeyStore;

		return this.applicationConfiguration;
	}

	/**
	 * Gets the cached {@link Application} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchApplicationConfiguration} if cache is empty
	 *
	 * @return {@link ApplicationConfigApplication} the requested configuration.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async getApplicationConfiguration(): Promise<Application> {
		await this.validateUser();

		if (typeof this.applicationConfiguration === "undefined") {
			return await this.fetchApplicationConfiguration()
		}

		return this.applicationConfiguration;
	}

	/**
	 * <p>
	 * Updates the {@link Application} configuration if no {@link ConfigurationResult#error} occured.
	 * </p>
	 * <p>
	 * Optionally also validates the {@link Application} configuration with additional {@link ApplicationCheck}s.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> Some of these changes might require a server restart to take effect.
	 * </p>
	 *
	 * @param configuration The {@link Application} configuration defines settings for the web services and
	 * 						the portal page.
	 * @param checks 		An optional list of {@link ApplicationCheck}s to validate the configuration.
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link Application} configuration is updated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async updateApplicationConfiguration(
		configuration: Application, checks?: Array<ApplicationCheck>
	): Promise<ConfigurationResult> {
		await this.validateUser();

		let applicationConfiguration: ApplicationConfiguration = ApplicationConfiguration.fromJson({
			configuration: configuration,
			configurationChecks: checks,
			configurationMode: ConfigurationMode.Write,
			configurationType: ConfigurationType.Application,
			globalKeyStore: await this.getGlobalKeyStore()
		} as ApplicationConfigurationInterface)

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("admin/configuration/"),
				this.prepareHttpEntity(applicationConfiguration),
				DataFormats.JSON.getMimeType()
			);

		let configurationResult: ConfigurationResult = ConfigurationResult.fromJson(
			await request.executeRequest()
		);

		if (configurationResult.error?.code === 0) {
			this.applicationConfiguration = configuration;
		}

		return configurationResult;
	}

	/**
	 * <p>
	 * Validates the {@link Application} configuration with the given {@link ApplicationCheck}s.
	 * </p>
	 *
	 * @param configuration The {@link Application} configuration defines settings for the web services and
	 * 						the portal page.
	 * @param checks 		The list of {@link ApplicationCheck}s to validate the configuration with.
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link Application} configuration is validated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async validateApplicationConfiguration(
		configuration: Application, checks: Array<ApplicationCheck>,
	): Promise<ConfigurationResult> {
		await this.validateUser();

		let applicationConfiguration: ApplicationConfiguration = ApplicationConfiguration.fromJson({
			configuration: configuration,
			configurationChecks: checks,
			configurationMode: ConfigurationMode.Validate,
			configurationType: ConfigurationType.Application,
			globalKeyStore: await this.getGlobalKeyStore()
		} as ApplicationConfigurationInterface)

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("admin/configuration/"),
				this.prepareHttpEntity(applicationConfiguration),
				DataFormats.JSON.getMimeType()
			);

		return ConfigurationResult.fromJson(await request.executeRequest());
	}

	/**
	 * Gets the {@link Server} configuration from the server updating the cached configuration.
	 *
	 * @return {@link Server} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchServerConfiguration(): Promise<Server> {
		await this.validateUser();

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL("admin/configuration/server"));

		let serverConfiguration: ServerConfiguration = ServerConfiguration.fromJson(
			await request.executeRequest()
		);

		this.serverConfiguration = serverConfiguration.configuration;
		this.connectorKeyStore = serverConfiguration.connectorKeyStore;
		this.trustStoreKeyStore = serverConfiguration.trustStoreKeyStore;

		return this.serverConfiguration;
	}

	/**
	 * Gets the cached {@link Server} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchServerConfiguration} if cache is empty
	 *
	 * @return {@link AdminServerConfiguration} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async getServerConfiguration(): Promise<Server> {
		await this.validateUser();

		if (typeof this.serverConfiguration === "undefined") {
			return await this.fetchServerConfiguration()
		}

		return this.serverConfiguration;
	}

	/**
	 * <p>
	 * Updates the {@link Server} configuration if no {@link ConfigurationResult#error} occured.
	 * </p>
	 * <p>
	 * Optionally also validates the {@link Server} configuration with additional {@link ServerCheck}s.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> Some of these changes might require a server restart to take effect.
	 * </p>
	 *
	 * @param configuration The {@link Server} configuration defines settings for the server such
	 * 						as the ports, user sources or authorization settings.
	 * @param checks 		An optional list of {@link ServerCheck}s to validate the configuration
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link Server} configuration is updated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async updateServerConfiguration(
		configuration: Server, checks?: Array<ServerCheck>
	): Promise<ConfigurationResult> {
		await this.validateUser();

		let serverConfiguration: ServerConfiguration = ServerConfiguration.fromJson({
			configuration: configuration,
			configurationChecks: checks,
			configurationMode: ConfigurationMode.Write,
			configurationType: ConfigurationType.Server,
			trustStoreKeyStore: await this.getTrustStoreKeyStore(),
			connectorKeyStore: await this.getConnectorKeyStore()
		} as ServerConfigurationInterface)

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("admin/configuration/"),
				this.prepareHttpEntity(serverConfiguration),
				DataFormats.JSON.getMimeType()
			);

		let configurationResult: ConfigurationResult = ConfigurationResult.fromJson(
			await request.executeRequest()
		);

		if (configurationResult.error?.code === 0) {
			this.serverConfiguration = configuration;
		}

		return configurationResult;
	}

	/**
	 * <p>
	 * Validates the {@link Server} configuration with the given {@link ServerCheck}s.
	 * </p>
	 *
	 * @param configuration The {@link Server} configuration defines settings for the web services and
	 * 						the portal page.
	 * @param checks 		The list of {@link ServerCheck}s to validate the configuration with.
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link Server} configuration is validated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async validateServerConfiguration(
		configuration: Server, checks: Array<ServerCheck>,
	): Promise<ConfigurationResult> {
		await this.validateUser();

		let serverConfiguration: ServerConfiguration = ServerConfiguration.fromJson({
			configuration: configuration,
			configurationChecks: checks,
			configurationMode: ConfigurationMode.Validate,
			configurationType: ConfigurationType.Server,
			trustStoreKeyStore: await this.getTrustStoreKeyStore(),
			connectorKeyStore: await this.getConnectorKeyStore()
		} as ServerConfigurationInterface)

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("admin/configuration/"),
				this.prepareHttpEntity(serverConfiguration),
				DataFormats.JSON.getMimeType()
			);

		return ConfigurationResult.fromJson(await request.executeRequest());
	}

	/**
	 * Gets the {@link Users} configuration of the server updating the cached configuration.
	 *
	 * @return {@link Users} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchUserConfiguration(): Promise<Users> {
		await this.validateUser();

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL("admin/configuration/user"));

		this.userConfiguration = UserConfiguration.fromJson(
			await request.executeRequest()
		).configuration;

		return this.userConfiguration;
	}

	/**
	 * Gets the cached {@link Users} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchUserConfiguration} if cache is empty
	 *
	 * @return {@link Users} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async getUserConfiguration(): Promise<Users> {
		await this.validateUser();

		if (typeof this.userConfiguration === "undefined") {
			return await this.fetchUserConfiguration();
		}

		return this.userConfiguration;
	}

	/**
	 * <p>
	 * Updates the {@link Users} configuration if no {@link ConfigurationResult#error} occured.
	 * </p>
	 * <p>
	 * Optionally also validates the {@link Users} configuration with additional {@link UserCheck}s.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> Some of these changes might require a server restart to take effect.
	 * </p>
	 *
	 * @param configuration The {@link Users} configuration lists users of the webPDF server.
	 * @param checks 		An optional list of {@link UserCheck}s to validate the configuration
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link Users} configuration is updated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async updateUserConfiguration(
		configuration: Users, checks?: Array<UserCheck>
	): Promise<ConfigurationResult> {
		await this.validateUser();

		let userConfiguration: UserConfiguration = UserConfiguration.fromJson({
			configuration: configuration,
			configurationChecks: checks,
			configurationMode: ConfigurationMode.Write,
			configurationType: ConfigurationType.User
		} as UserConfigurationInterface)

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("admin/configuration/"),
				this.prepareHttpEntity(userConfiguration),
				DataFormats.JSON.getMimeType()
			);

		let configurationResult: ConfigurationResult = ConfigurationResult.fromJson(
			await request.executeRequest()
		);

		if (configurationResult.error?.code === 0) {
			this.userConfiguration = configuration;
		}

		return configurationResult;
	}

	/**
	 * <p>
	 * Validates the {@link Users} configuration with the given {@link UserCheck}s.
	 * </p>
	 *
	 * @param configuration The {@link Users} configuration defines settings for the web services and
	 * 						the portal page.
	 * @param checks 		The list of {@link UserCheck}s to validate the configuration with.
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link Users} configuration is validated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async validateUserConfiguration(
		configuration: Users, checks: Array<UserCheck>,
	): Promise<ConfigurationResult> {
		await this.validateUser();

		let userConfiguration: UserConfiguration = UserConfiguration.fromJson({
			configuration: configuration,
			configurationChecks: checks,
			configurationMode: ConfigurationMode.Validate,
			configurationType: ConfigurationType.User
		} as UserConfigurationInterface)

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("admin/configuration/"),
				this.prepareHttpEntity(userConfiguration),
				DataFormats.JSON.getMimeType()
			);

		return ConfigurationResult.fromJson(await request.executeRequest());
	}

	/**
	 * Gets the {@link LogFileConfiguration} from the server updating the cached configuration.
	 *
	 * @return {@link LogFileConfiguration} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchLogConfiguration(): Promise<LogFileConfiguration> {
		await this.validateUser();

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL("admin/configuration/log"));

		this.logConfiguration = LogConfiguration.fromJson(
			await request.executeRequest()
		).configuration

		return this.logConfiguration;
	}

	/**
	 * Gets the cached {@link LogFileConfiguration} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchLogConfiguration} if cache is empty
	 *
	 * @return {@link LogFileConfiguration} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async getLogConfiguration(): Promise<LogFileConfiguration> {
		await this.validateUser();

		if (typeof this.logConfiguration === "undefined") {
			return await this.fetchLogConfiguration();
		}

		return this.logConfiguration;
	}

	/**
	 * <p>
	 * Updates the {@link LogFileConfiguration} if no {@link ConfigurationResult#error} occured.
	 * </p>
	 * <p>
	 * Optionally also validates the {@link LogFileConfiguration} with additional {@link LogCheck}s.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> Some of these changes might require a server restart to take effect.
	 * </p>
	 *
	 * @param configuration The {@link LogFileConfiguration} provides information and settings about
	 * 						the configured server logging.
	 * @param checks 		An optional list of {@link LogCheck}s to validate the configuration
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link LogFileConfiguration} is updated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async updateLogConfiguration(
		configuration: LogFileConfiguration, checks?: Array<LogCheck>
	): Promise<ConfigurationResult> {
		await this.validateUser();

		let logConfiguration: LogConfiguration = LogConfiguration.fromJson({
			configuration: configuration,
			configurationChecks: checks,
			configurationMode: ConfigurationMode.Write,
			configurationType: ConfigurationType.Log
		} as LogConfigurationInterface)

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("admin/configuration/"),
				this.prepareHttpEntity(logConfiguration),
				DataFormats.JSON.getMimeType()
			);

		let configurationResult: ConfigurationResult = ConfigurationResult.fromJson(
			await request.executeRequest()
		);

		if (configurationResult.error?.code === 0) {
			this.logConfiguration = configuration;
		}

		return configurationResult;
	}

	/**
	 * <p>
	 * Validates the {@link LogFileConfiguration} configuration with the given {@link LogCheck}s.
	 * </p>
	 *
	 * @param configuration The {@link LogFileConfiguration} configuration defines settings for the web services and
	 * 						the portal page.
	 * @param checks 		The list of {@link LogCheck}s to validate the configuration with.
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link LogFileConfiguration} configuration is validated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async validateLogConfiguration(
		configuration: LogFileConfiguration, checks: Array<LogCheck>,
	): Promise<ConfigurationResult> {
		await this.validateUser();

		let logConfiguration: LogConfiguration = LogConfiguration.fromJson({
			configuration: configuration,
			configurationChecks: checks,
			configurationMode: ConfigurationMode.Validate,
			configurationType: ConfigurationType.Log
		} as LogConfigurationInterface)

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("admin/configuration/"),
				this.prepareHttpEntity(logConfiguration),
				DataFormats.JSON.getMimeType()
			);

		return ConfigurationResult.fromJson(await request.executeRequest());
	}

	/**
	 * Gets the {@link GlobalKeyStore} of the server updating the cached keystore.
	 *
	 * @return {@link GlobalKeyStore} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchGlobalKeyStore(): Promise<GlobalKeyStore> {
		await this.validateUser();

		await this.fetchApplicationConfiguration();

		return this.globalKeyStore!;
	}

	/**
	 * Gets the cached {@link GlobalKeyStore} of the server or fetches via
	 * {@link AdministrationManager#fetchGlobalKeyStore} if cache is empty
	 *
	 * @return {@link GlobalKeyStore} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async getGlobalKeyStore(): Promise<GlobalKeyStore> {
		await this.validateUser();

		if (typeof this.globalKeyStore === "undefined") {
			await this.fetchGlobalKeyStore();
		}

		return this.globalKeyStore!;
	}

	/**
	 * <p>
	 * Sets the {@link GlobalKeyStore} of the server.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> This needs to be updated via {@link updateApplicationConfiguration} to take effekt on the server.
	 * </p>
	 *
	 * @param keystore the {@link GlobalKeyStore} to set
	 */
	public setGlobalKeyStore(keystore: GlobalKeyStore): void {
		this.globalKeyStore = keystore;
	}

	/**
	 * Gets the {@link TrustStoreKeyStore} from the server updating the cached keystore.
	 *
	 * @return {@link TrustStoreKeyStore} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchTrustStoreKeyStore(): Promise<TrustStoreKeyStore> {
		await this.validateUser();

		await this.fetchServerConfiguration();

		return this.trustStoreKeyStore!;
	}

	/**
	 * Gets the cached {@link TrustStoreKeyStore} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchTrustStoreKeyStore} if cache is empty
	 *
	 * @return {@link TrustStoreKeyStore} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async getTrustStoreKeyStore(): Promise<TrustStoreKeyStore> {
		await this.validateUser();

		if (typeof this.trustStoreKeyStore === "undefined") {
			await this.fetchTrustStoreKeyStore();
		}

		return this.trustStoreKeyStore!;
	}

	/**
	 * <p>
	 * Sets the {@link TrustStoreKeyStore} of the server.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> This needs to be updated via {@link updateServerConfiguration} to take effekt on the server.
	 * </p>
	 *
	 * @param keystore the {@link TrustStoreKeyStore} to set
	 */
	public setTrustStoreKeyStore(keystore: TrustStoreKeyStore): void {
		this.trustStoreKeyStore = keystore;
	}

	/**
	 * Gets the {@link { [key: string]: ConnectorKeyStore; }} from the server updating the cached keystore.
	 *
	 * @return {@link { [key: string]: ConnectorKeyStore; }} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchConnectorKeyStore(): Promise<{ [key: string]: ConnectorKeyStore; }> {
		await this.validateUser();

		await this.fetchServerConfiguration();

		return this.connectorKeyStore!;
	}

	/**
	 * Gets the cached {@link { [key: string]: ConnectorKeyStore; }} of the server or fetches via
	 * {@link AdministrationManager#fetchConnectorKeyStore} if cache is empty
	 *
	 * @return {@link { [key: string]: ConnectorKeyStore; }} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async getConnectorKeyStore(): Promise<{ [key: string]: ConnectorKeyStore; }> {
		await this.validateUser();

		if (typeof this.connectorKeyStore === "undefined") {
			await this.fetchConnectorKeyStore();
		}

		return this.connectorKeyStore!;
	}

	/**
	 * <p>
	 * Sets the {@link { [key: string]: ConnectorKeyStore; }} of the server.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> This needs to be updated via {@link updateServerConfiguration} to take effekt on the server.
	 * </p>
	 *
	 * @param keystore the {@link { [key: string]: ConnectorKeyStore; }} to set
	 */
	public setConnectorKeyStore(keystore: { [key: string]: ConnectorKeyStore; }): void {
		this.connectorKeyStore = keystore;
	}

	/**
	 * This is a shortcut function to validate {@link Application} configuration executables
	 *
	 * @param configuration The {@link Application} configuration defines settings for the web services and
	 * 						the portal page.
	 * @param executables 	A list of {@link ExecutableName}s to validate
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link Application} configuration validated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async testExecutables(
		configuration: Application, executables: Array<ExecutableName>
	): Promise<ConfigurationResult> {
		await this.validateUser();

		let applicationConfiguration: ApplicationConfiguration = ApplicationConfiguration.fromJson({
			configuration: configuration,
			configurationChecks: [
				{
					checkType: ApplicationCheckMode.Executable,
					executables: executables
				} as ExecutableApplicationCheckInterface
			],
			configurationMode: ConfigurationMode.Validate,
			configurationType: ConfigurationType.Application,
			globalKeyStore: await this.getGlobalKeyStore()
		} as ApplicationConfigurationInterface)

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("admin/configuration/"),
				this.prepareHttpEntity(applicationConfiguration),
				DataFormats.JSON.getMimeType()
			)

		return ConfigurationResult.fromJson(await request.executeRequest());
	}

	/**
	 * Retrieves a file, depending on the selected {@link FileGroupDataStore}, from the server's data store.
	 * If {@link FileGroupDataStore.Generic} is set, the file to get is referenced by the optional
	 * filename parameter.
	 *
	 * @param group The group of datastore files to search for the file.
	 * @param filename an optional filename to specify the file if {@link FileGroupDataStore.Generic} is set
	 * @return The requested {@link FileDataStore}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchDatastore(group: FileGroupDataStore, filename?: string): Promise<FileDataStore> {
		await this.validateUser();

		let searchParams: URLSearchParams = new URLSearchParams();
		if (typeof filename !== "undefined") {
			searchParams.set("name", filename);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL("admin/datastore/" + group, searchParams));

		return FileDataStore.fromJson(await request.executeRequest())
	}

	/**
	 * Updates a file in the server's data store.
	 *
	 * @param fileDataStore Bundles the file, the file group and the settings to be updated as
	 * 						{@link FileDataStore}
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async updateDatastore(fileDataStore: FileDataStore): Promise<void> {
		await this.validateUser();

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.POST,
				this.session.getURL("admin/datastore/"),
				this.prepareHttpEntity(fileDataStore),
				DataFormats.JSON.getMimeType()
			);

		await request.executeRequest();
	}

	/**
	 * Deletes a file, depending on the selected {@link FileGroupDataStore}, from the server's data store.
	 * If {@link FileGroupDataStore.Generic} is set, the file to delete is referenced by the optional
	 * filename parameter.
	 *
	 * @param group The group of datastore files to search for the file.
	 * @param filename an optional filename to specify the file if {@link FileGroupDataStore.Generic} is set
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async deleteDatastore(group: FileGroupDataStore, filename?: string): Promise<void> {
		await this.validateUser();

		let searchParams: URLSearchParams = new URLSearchParams();
		if (typeof filename !== "undefined") {
			searchParams.set("name", filename);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.DELETE, this.session.getURL("admin/datastore/" + group, searchParams));

		await request.executeRequest();
	}

	/**
	 * <p>
	 * <b>(Experimental Web service)</b>
	 * </p>
	 * <p>
	 * Reads statistic information from the server for Web services and file formats.
	 * </p>
	 *
	 * @param dataSource  Data source from which the data is read.
	 * @param aggregation Aggregation mode for the retrieved data.
	 * @param webservices List of webservice names from which the data should be retrieved.
	 * @param start 	  Start date for the data, formatted as ISO-8601 extended offset (zoned based) date-time
	 * 					  format.
	 * @param end 		  End date for the data, formatted as ISO-8601 extended offset (zoned based) date-time
	 * 					  format.
	 * @return The requested {@link Statistic}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchServerStatistic(
		dataSource: DataSourceServerState, aggregation: AggregationServerState,
		webservices: Array<Webservice>, start: Date, end: Date
	): Promise<Statistic> {
		await this.validateUser();

		let searchParams: URLSearchParams = new URLSearchParams();
		searchParams.set("start", start.toISOString());
		searchParams.set("end", end.toISOString());

		for (let webservice of webservices) {
			searchParams.append("webservice", webservice);
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(
				HttpMethod.GET,
				this.session.getURL("admin/statistic/" + [dataSource, aggregation].join("/"), searchParams)
			)

		return Statistic.fromJson(await request.executeRequest());
	}

	/**
	 * Returns the session table from server with detailed status information about each session.
	 *
	 * @return The requested {@link SessionTable}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async fetchSessionTable(): Promise<SessionTable> {
		await this.validateUser();

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.GET, this.session.getURL("admin/session/table"));

		return SessionTable.fromJson(await request.executeRequest());
	}

	/**
	 * Closes the session with the specified ID, by activating the session expiration. After the call, any access
	 * to the session results in an error.
	 *
	 * @param sessionId ID of the session to be closed.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	public async closeSession(sessionId: string): Promise<void> {
		await this.validateUser();

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.buildRequest(HttpMethod.POST, this.session.getURL("admin/session/" + sessionId + "/close"));

		await request.executeRequest();
	}

	/**
	 * Prepares a {@link Parameter} entity for internal requests to the webPDF server.
	 *
	 * @template T
	 * @param parameter The parameters, that shall be used for the request.
	 * @param {T}       The parameter type (data transfer object/bean) that shall be used.
	 * @return The resulting state of the data transfer object.
	 * @throws ResultException Shall be thrown, should the creation fail.
	 */
	private prepareHttpEntity<T extends Parameter>(parameter: T): string {
		try {
			return JSON.stringify(parameter.toJson());
		} catch (ex: any) {
			throw new ClientResultException(WsclientErrors.XML_OR_JSON_CONVERSION_FAILURE, ex);
		}
	}
}
