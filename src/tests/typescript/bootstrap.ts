import {TestConfig, TestServer} from "./testsuite";

const testServer: TestServer = new TestServer();

exports.mochaGlobalSetup = async function () {
	if (TestConfig.instance.getIntegrationTestConfig().isContainerActive()) {
		await testServer.start();
	}
}

exports.mochaGlobalTeardown = async function () {
	if (TestConfig.instance.getIntegrationTestConfig().isContainerActive()) {
		await testServer.stop();
	}
}