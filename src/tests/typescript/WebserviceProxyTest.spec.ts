import {IntegrationTestConfig, TestConfig, TestServer} from "./testsuite";
import {expect} from "chai";
import {
	RestDocument,
	RestSession,
	SessionContext,
	SessionFactory,
	UrlConverterWebService,
	UserAuthProvider,
	WebServiceProtocol,
	WebServiceTypes
} from "../../main/typescript";
import {AxiosProxyConfig} from "axios";
import {UrlConverter, UrlConverterInterface} from "../../main/typescript/generated-sources";
import {Agent} from "https";
import {it, suite} from "mocha";

const fs = require('fs');
const tmp = require('tmp');

suite("WebserviceProxyTest", function () {
	let testServer: TestServer = new TestServer();
	tmp.setGracefulCleanup();
	const testConfig: IntegrationTestConfig =  TestConfig.instance.getIntegrationTestConfig();

	it('testRESTProxyHTTP', async function () {
		if (!testConfig.isProxyTestsActive()) {
			this.skip();
			return;
		}

		let sessionContext: SessionContext = new SessionContext(
			WebServiceProtocol.REST, new URL(testConfig.getProxyUrl())
		);
		sessionContext.setProxy({
			host: "127.0.0.1",
			port: 8888
		} as AxiosProxyConfig);

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			sessionContext, new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let webService: UrlConverterWebService<RestDocument> = session.createWebServiceInstance(WebServiceTypes.URLCONVERTER);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		webService.setOperationParameters(
			UrlConverter.fromJson({
				url: "https://docs.webpdf.de",
				page: {
					width: 150.0,
					height: 200.0,
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
				}
			} as UrlConverterInterface)
		);

		let resultDocument: RestDocument | undefined = await webService.process();
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});

	it('testRESTProxyHTTPS', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isProxyTestsActive()) {
			this.skip();
			return;
		}

		let sessionContext: SessionContext = new SessionContext(
			WebServiceProtocol.REST, new URL(testConfig.getProxyUrlSSL())
		);

		sessionContext.setTlsContext(new Agent({
			rejectUnauthorized: false
		}));
		sessionContext.setProxy({
			protocol: "https",
			host: "127.0.0.1",
			port: 8888
		});

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			sessionContext, new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let webService: UrlConverterWebService<RestDocument> = session.createWebServiceInstance(WebServiceTypes.URLCONVERTER);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		webService.setOperationParameters(
			UrlConverter.fromJson({
				url: "https://docs.webpdf.de",
				page: {
					width: 150.0,
					height: 200.0,
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
				}
			} as UrlConverterInterface)
		);

		let resultDocument: RestDocument | undefined = await webService.process();
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});
});
