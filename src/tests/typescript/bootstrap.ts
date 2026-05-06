import {TestConfig, TestServer} from "./testsuite";

let testServer: TestServer | null = null;

exports.mochaGlobalSetup = async function (): Promise<void> {
	if (TestConfig.instance.getIntegrationTestConfig().isContainerActive()) {
		testServer = new TestServer();
		await testServer.start();
	}
}

exports.mochaGlobalTeardown = async function (): Promise<void> {
	if (TestConfig.instance.getIntegrationTestConfig().isContainerActive() && testServer) {
		await testServer.stop();
	}
}
