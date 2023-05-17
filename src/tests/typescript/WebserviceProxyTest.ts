import {ServerType, TestConfig, TestServer, TransferProtocol} from "./testsuite";
import {expect} from "chai";
import {RestDocument, RestSession, SessionContext, SessionFactory, TLSProtocol, UrlConverterWebService, UserAuthProvider, WebServiceProtocol, WebServiceTypes} from "../../main/typescript";
import {AxiosProxyConfig} from "axios";
import {UrlConverter, UrlConverterInterface} from "../../main/typescript/generated-sources";
import {Agent} from "https";

const fs = require('fs');
const tmp = require('tmp');

describe("WebserviceProxyTest", function () {
	let testServer: TestServer = new TestServer();
	tmp.setGracefulCleanup();

	it('testRESTProxyHTTP', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isProxyTestsActive()) {
			this.skip();
			return;
		}

		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL));
		sessionContext.setProxy({
			host: "127.0.0.1",
			port: 8888
		} as AxiosProxyConfig);

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			sessionContext, new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let webService: UrlConverterWebService<RestDocument> = session.createWebServiceInstance(WebServiceTypes.URLCONVERTER);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		webService.setOperationParameters(
			UrlConverter.fromJson({
				url: "https://www.webpdf.de",
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
			WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL, TransferProtocol.HTTPS)
		);
		let certificate = await testServer.getDemoCertificate();
		sessionContext.setTlsContext(
			new Agent({
				secureProtocol: TLSProtocol.TLSV1_2,
				rejectUnauthorized: false, // allow self-signed
				key: certificate.pubkey,
				cert: certificate.raw
			})
		);
		sessionContext.setProxy({
			host: "127.0.0.1",
			port: 8443
		} as AxiosProxyConfig);

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			sessionContext, new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let webService: UrlConverterWebService<RestDocument> = session.createWebServiceInstance(WebServiceTypes.URLCONVERTER);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		webService.setOperationParameters(
			UrlConverter.fromJson({
				url: "https://www.webpdf.de",
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
