import {TestConfig, TestServer} from "./testsuite";

const testServer: TestServer = new TestServer();

before(async (): Promise<void> => {
	if (TestConfig.instance.getIntegrationTestConfig().isContainerActive()) {
		await testServer.start();
	}
});

after(async (): Promise<void> => {
	if (TestConfig.instance.getIntegrationTestConfig().isContainerActive()) {
		await testServer.stop();
	}
});