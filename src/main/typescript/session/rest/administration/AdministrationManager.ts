import {RestSession} from "../RestSession";
import {RestDocument} from "../documents";
import {AxiosProgressEvent} from "axios";
import {HttpRestRequest} from "../../connection";
import {
	AggregationServerState,
	Application,
	ApplicationCheck,
	ClusterCheck,
	ClusterSettings,
	ClusterStatus,
	ConfigurationResult,
	ConnectorKeyStore,
	DataSourceServerState,
	ExecutableName,
	FileDataStore,
	FileGroupDataStore,
	GlobalKeyStore,
	LogCheck,
	LogFileConfiguration,
	ProviderCheck,
	ProviderSettings,
	Server,
	ServerCheck,
	ServerStatus,
	SessionTable,
	Statistic,
	SupportEntryGroup,
	TrustStoreKeyStore,
	UserCheck,
	Users,
	Webservice
} from "../../../generated-sources";

/**
 * A class implementing {@link AdministrationManager} administrates and monitors the webPDF server configurations.
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} used by the currently active {@link RestSession}.
 */
export interface AdministrationManager<T_REST_DOCUMENT extends RestDocument> {
	/**
	 * Returns the {@link RestSession} used by this {@link AdministrationManager}.
	 *
	 * @return The {@link RestSession} used by this {@link AdministrationManager}.
	 */
	getSession(): RestSession<T_REST_DOCUMENT>

	/**
	 * Returns the byte size of the current log or a specific log file of the server. If the date query parameter
	 * is specified, an explicitly selected log will be read.
	 *
	 * @param date The date (yyyy-MM-dd) of a specific searched log
	 * @return number the length of the requested log
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchLogLength(date?: string): Promise<number>;

	/**
	 * Returns the contents of the current log or a specific log file of the server. If the date query parameter
	 * is specified, an explicitly selected log will be read.
	 *
	 * @param range A specific optional byte range (e.g. 0-1024) to extract from the server log
	 * @param date A specific optional date (yyyy-MM-dd) to extract from the server log
	 * @return number The contents of the current log or a specific log file of the server
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchLog(range?: string, date?: string): Promise<string>;

	/**
	 * Provides status information about the server, the JVM and the Web services.
	 *
	 * @return {@link ServerStatus} The status information about the server.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchServerStatus(): Promise<ServerStatus>;

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
	buildSupportPackage(group?: Array<SupportEntryGroup>, start?: string, end?: string, options?: {
		onProgress?: (event: AxiosProgressEvent) => void,
		abortSignal?: AbortSignal
	}): Promise<Buffer>;

	/**
	 * Restarts the server.
	 *
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	restartServer(): Promise<void>;

	/**
	 * Gets the {@link Application} configuration from the server updating the cached configuration.
	 *
	 * @return {@link Application} the requested configuration.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchApplicationConfiguration(): Promise<Application>;

	/**
	 * Gets the cached {@link Application} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchApplicationConfiguration} if cache is empty
	 *
	 * @return {@link ApplicationConfigApplication} the requested configuration.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getApplicationConfiguration(): Promise<Application>;

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
	updateApplicationConfiguration(
		configuration: Application, checks?: Array<ApplicationCheck>
	): Promise<ConfigurationResult>;

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
	validateApplicationConfiguration(
		configuration: Application, checks: Array<ApplicationCheck>,
	): Promise<ConfigurationResult>;

	/**
	 * Gets the {@link Server} configuration from the server updating the cached configuration.
	 *
	 * @return {@link Server} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchServerConfiguration(): Promise<Server>;

	/**
	 * Gets the cached {@link Server} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchServerConfiguration} if cache is empty
	 *
	 * @return {@link AdminServerConfiguration} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getServerConfiguration(): Promise<Server>;

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
	updateServerConfiguration(
		configuration: Server, checks?: Array<ServerCheck>
	): Promise<ConfigurationResult>;

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
	validateServerConfiguration(
		configuration: Server, checks: Array<ServerCheck>,
	): Promise<ConfigurationResult>;

	/**
	 * Gets the {@link Users} configuration of the server updating the cached configuration.
	 *
	 * @return {@link Users} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchUserConfiguration(): Promise<Users>;

	/**
	 * Gets the cached {@link Users} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchUserConfiguration} if cache is empty
	 *
	 * @return {@link Users} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getUserConfiguration(): Promise<Users>;

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
	updateUserConfiguration(
		configuration: Users, checks?: Array<UserCheck>
	): Promise<ConfigurationResult>;

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
	validateUserConfiguration(
		configuration: Users, checks: Array<UserCheck>,
	): Promise<ConfigurationResult>;

	/**
	 * Gets the {@link LogFileConfiguration} from the server updating the cached configuration.
	 *
	 * @return {@link LogFileConfiguration} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchLogConfiguration(): Promise<LogFileConfiguration>;

	/**
	 * Gets the cached {@link LogFileConfiguration} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchLogConfiguration} if cache is empty
	 *
	 * @return {@link LogFileConfiguration} the requested configuration
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getLogConfiguration(): Promise<LogFileConfiguration>;

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
	updateLogConfiguration(
		configuration: LogFileConfiguration, checks?: Array<LogCheck>
	): Promise<ConfigurationResult>;

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
	validateLogConfiguration(
		configuration: LogFileConfiguration, checks: Array<LogCheck>,
	): Promise<ConfigurationResult>;

	/**
	 * Gets the {@link GlobalKeyStore} of the server updating the cached keystore.
	 *
	 * @return {@link GlobalKeyStore} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchGlobalKeyStore(): Promise<GlobalKeyStore>;

	/**
	 * Gets the cached {@link GlobalKeyStore} of the server or fetches via
	 * {@link AdministrationManager#fetchGlobalKeyStore} if cache is empty
	 *
	 * @return {@link GlobalKeyStore} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getGlobalKeyStore(): Promise<GlobalKeyStore>;

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
	setGlobalKeyStore(keystore: GlobalKeyStore): void;

	/**
	 * Gets the {@link TrustStoreKeyStore} from the server updating the cached keystore.
	 *
	 * @return {@link TrustStoreKeyStore} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchTrustStoreKeyStore(): Promise<TrustStoreKeyStore>;

	/**
	 * Gets the cached {@link TrustStoreKeyStore} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchTrustStoreKeyStore} if cache is empty
	 *
	 * @return {@link TrustStoreKeyStore} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getTrustStoreKeyStore(): Promise<TrustStoreKeyStore>;

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
	setTrustStoreKeyStore(keystore: TrustStoreKeyStore): void;

	/**
	 * Gets the {@link { [key: string]: ConnectorKeyStore; }} from the server updating the cached keystore.
	 *
	 * @return {@link { [key: string]: ConnectorKeyStore; }} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchConnectorKeyStore(): Promise<{ [key: string]: ConnectorKeyStore; }>;

	/**
	 * Gets the cached {@link { [key: string]: ConnectorKeyStore; }} of the server or fetches via
	 * {@link AdministrationManager#fetchConnectorKeyStore} if cache is empty
	 *
	 * @return {@link { [key: string]: ConnectorKeyStore; }} the requested keystore
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getConnectorKeyStore(): Promise<{ [key: string]: ConnectorKeyStore; }>;

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
	setConnectorKeyStore(keystore: { [key: string]: ConnectorKeyStore; }): void

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
	testExecutables(
		configuration: Application, executables: Array<ExecutableName>
	): Promise<ConfigurationResult>;

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
	fetchDatastore(group: FileGroupDataStore, filename?: string): Promise<FileDataStore>;

	/**
	 * Updates a file in the server's data store.
	 *
	 * @param fileDataStore Bundles the file, the file group and the settings to be updated as
	 * 						{@link FileDataStore}
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	updateDatastore(fileDataStore: FileDataStore): Promise<void>;

	/**
	 * Deletes a file, depending on the selected {@link FileGroupDataStore}, from the server's data store.
	 * If {@link FileGroupDataStore.Generic} is set, the file to delete is referenced by the optional
	 * filename parameter.
	 *
	 * @param group The group of datastore files to search for the file.
	 * @param filename an optional filename to specify the file if {@link FileGroupDataStore.Generic} is set
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	deleteDatastore(group: FileGroupDataStore, filename?: string): Promise<void>;

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
	fetchServerStatistic(
		dataSource: DataSourceServerState, aggregation: AggregationServerState,
		webservices: Array<Webservice>, start: Date, end: Date
	): Promise<Statistic>;

	/**
	 * Returns the session table from server with detailed status information about each session.
	 *
	 * @return The requested {@link SessionTable}.
	 */
	fetchSessionTable(): Promise<SessionTable>;

	/**
	 * Closes the session with the specified ID, by activating the session expiration. After the call, any access
	 * to the session results in an error.
	 *
	 * @param sessionId ID of the session to be closed.
	 */
	closeSession(sessionId: string): Promise<void>;


	/**
	 * Gets the {@link ClusterSettings} configuration from the server updating the cached configuration.
	 *
	 * @return {@link ClusterSettings} the requested configuration.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchClusterConfiguration(): Promise<ClusterSettings>;

	/**
	 * Gets the cached {@link ClusterSettings} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchClusterConfiguration} if cache is empty
	 *
	 * @return {@link ClusterSettings} the requested configuration.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getClusterConfiguration(): Promise<ClusterSettings>;

	/**
	 * <p>
	 * Updates the {@link ClusterSettings} configuration if no {@link ConfigurationResult#error} occured.
	 * </p>
	 * <p>
	 * Optionally also validates the {@link ClusterSettings} configuration with additional {@link ClusterCheck}s.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> Some of these changes might require a server restart to take effect.
	 * </p>
	 *
	 * @param configuration The {@link ClusterSettings} configuration defines settings for server clusters.
	 * @param checks 		An optional list of {@link ClusterCheck}s to validate the configuration.
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link ClusterSettings} configuration is updated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	updateClusterConfiguration(
		configuration: ClusterSettings, checks?: Array<ClusterCheck>
	): Promise<ConfigurationResult>;

	/**
	 * <p>
	 * Validates the {@link ClusterSettings} configuration with the given {@link ClusterCheck}s.
	 * </p>
	 *
	 * @param configuration The {@link ClusterSettings} configuration defines settings for server clusters.
	 * @param checks 		The list of {@link ClusterCheck}s to validate the configuration with.
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link ClusterSettings} configuration is validated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	validateClusterConfiguration(
		configuration: ClusterSettings, checks: Array<ClusterCheck>,
	): Promise<ConfigurationResult>;


	/**
	 * Gets the {@link ProviderSettings} configuration from the server updating the cached configuration.
	 *
	 * @return {@link ProviderSettings} the requested configuration.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchProviderConfiguration(): Promise<ProviderSettings>;

	/**
	 * Gets the cached {@link ProviderSettings} configuration of the server or fetches via
	 * {@link AdministrationManager#fetchProviderConfiguration} if cache is empty
	 *
	 * @return {@link ProviderSettings} the requested configuration.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	getProviderConfiguration(): Promise<ProviderSettings>;

	/**
	 * <p>
	 * Updates the {@link ProviderSettings} configuration if no {@link ConfigurationResult#error} occured.
	 * </p>
	 * <p>
	 * Optionally also validates the {@link ProviderSettings} configuration with additional {@link ProviderCheck}s.
	 * </p>
	 * <p>
	 * <b>Be Aware:</b> Some of these changes might require a server restart to take effect.
	 * </p>
	 *
	 * @param configuration The {@link ProviderSettings} configuration defines settings for providers.
	 * @param checks 		An optional list of {@link ProviderCheck}s to validate the configuration.
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link ProviderSettings} configuration is updated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	updateProviderConfiguration(
		configuration: ProviderSettings, checks?: Array<ProviderCheck>
	): Promise<ConfigurationResult>;

	/**
	 * <p>
	 * Validates the {@link ProviderSettings} configuration with the given {@link ProviderCheck}s.
	 * </p>
	 *
	 * @param configuration The {@link ProviderSettings} configuration defines settings for server providers.
	 * @param checks 		The list of {@link ProviderCheck}s to validate the configuration with.
	 * @return defines an extended {@link ConfigurationResult} for administrative configuration operations
	 * 			when the {@link ProviderSettings} configuration is validated.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	validateProviderConfiguration(
		configuration: ProviderSettings, checks: Array<ProviderCheck>,
	): Promise<ConfigurationResult>;

	/**
	 * Returns the cluster status from server.
	 *
	 * @return The requested {@link ClusterStatus}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchClusterStatus(): Promise<ClusterStatus>;
}