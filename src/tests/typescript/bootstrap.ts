import {TestConfig, TestServer} from "./testsuite/index.js";

let testServer: TestServer | null = null;

export async function mochaGlobalSetup(): Promise<void> {
	if (TestConfig.instance.getIntegrationTestConfig().isContainerActive()) {
		testServer = new TestServer();
		await testServer.start();
	}
}

export async function mochaGlobalTeardown(): Promise<void> {
	if (TestConfig.instance.getIntegrationTestConfig().isContainerActive() && testServer) {
		await testServer.stop();
	}
}
