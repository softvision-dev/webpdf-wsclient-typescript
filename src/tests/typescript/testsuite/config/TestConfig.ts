import {ServerConfig} from "./server";
import {IntegrationTestConfig} from "./integration";
import {JsonNode} from "./json";

const fs = require('fs');
const path = require('path');

export class TestConfig {
	private static readonly TEST_CONFIG_LOCATION: string = "config/testConfig.json";
	private static _instance?: TestConfig;
	private readonly serverConfig: ServerConfig;
	private readonly integrationTestConfig: IntegrationTestConfig;

	private constructor() {
		let configPath: string = path.join(__dirname, "../../../../../", TestConfig.TEST_CONFIG_LOCATION);

		let configNode: any;
		if (fs.existsSync(configPath) && fs.lstatSync(configPath).isFile()) {
			configNode = JSON.parse(fs.readFileSync(configPath, {encoding: "utf8"}));
		}

		this.serverConfig = new ServerConfig(JsonNode.find(configNode, ServerConfig.SERVER_CONFIG_NODE));
		this.integrationTestConfig = new IntegrationTestConfig(JsonNode.find(configNode, IntegrationTestConfig.INTEGRATION_TEST_CONFIG));
	}

	public getServerConfig(): ServerConfig {
		return this.serverConfig;
	}

	public getIntegrationTestConfig(): IntegrationTestConfig {
		return this.integrationTestConfig;
	}

	public static get instance(): TestConfig {
		if (typeof this._instance === "undefined") {
			this._instance = new TestConfig();
		}

		return this._instance!;
	}
}