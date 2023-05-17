import {ConfigNodeContainer, JsonNode} from "../json";
import {Auth0Config, AzureConfig} from "./oauth";

export class IntegrationTestConfig extends ConfigNodeContainer {
	public static readonly INTEGRATION_TEST_CONFIG: string = "/integrationTests";
	private readonly auth0Config: Auth0Config;
	private readonly azureConfig: AzureConfig;

	public constructor(node: any) {
		super(node);

		this.auth0Config = new Auth0Config(typeof node !== "undefined" ?
			JsonNode.find(node, Auth0Config.OAUTH_AUTH_0_CONFIG_NODE) : undefined);
		this.azureConfig = new AzureConfig(typeof node !== "undefined" ?
			JsonNode.find(node, AzureConfig.OAUTH_AZURE_CONFIG_NODE) : undefined);
	}

	public isIntegrationTestsActive(): boolean {
		return this.getBoolean("enabled", false);
	}

	public isProxyTestsActive(): boolean {
		return this.getBoolean("/proxy/enabled", false);
	}

	public isTlsTestsActive(): boolean {
		return this.getBoolean("/tls/enabled", false);
	}

	public isLdapTestsActive(): boolean {
		return this.getBoolean("/ldap/enabled", false);
	}

	public getAuth0Config(): Auth0Config {
		return this.auth0Config;
	}

	public getAzureConfig(): AzureConfig {
		return this.azureConfig;
	}

	public getLicensee(): string {
		return this.getString("license/licensee", "");
	}

	public getLicenseKey(): string {
		return this.getString("license/key", "");
	}
}