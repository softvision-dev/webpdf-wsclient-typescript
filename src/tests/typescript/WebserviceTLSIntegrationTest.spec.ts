import {expect} from "chai";
import {ServerType, TestConfig, TestResources, TestServer, TransferProtocol} from "./testsuite";
import {ConverterWebService, RestDocument, RestSession, SessionContext, SessionFactory, WebServiceFactory, WebServiceProtocol, WebServiceTypes} from "../../main/typescript";
import {Agent, AgentOptions} from "https";
import {it} from "mocha";
import {DetailedPeerCertificate} from "tls";

require("./bootstrap");

const fs = require('fs');
const tmp = require('tmp');

describe("WebserviceTLSIntegrationTest", function () {
	const CERT_START: string = '-----BEGIN CERTIFICATE-----\n';
	const CERT_END: string = '\n-----END CERTIFICATE-----';
	let testResources: TestResources = new TestResources('integration/files');
	let testServer: TestServer = new TestServer();
	tmp.setGracefulCleanup();

	let testRestSSL = async function (url: URL, peerCertificate: DetailedPeerCertificate | undefined, selfSigned: boolean) {
		let options: AgentOptions = {
			rejectUnauthorized: !selfSigned
		};

		if (typeof peerCertificate !== "undefined") {
			let certificateChain: Array<string> = [];

			let currentCertificate: DetailedPeerCertificate = peerCertificate;
			while (typeof currentCertificate.raw !== "undefined" && currentCertificate.raw !== null) {
				certificateChain.push(
					CERT_START + currentCertificate.raw.toString('base64') + CERT_END
				);

				if (typeof currentCertificate.issuerCertificate === "undefined") {
					break;
				}

				currentCertificate = currentCertificate.issuerCertificate;
			}

			options.cert = certificateChain;
		}

		let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, url);
		sessionContext.setTlsContext(new Agent(options));
		let session: RestSession<RestDocument> = await SessionFactory.createInstance(sessionContext);

		let filename: string = "lorem-ipsum.docx";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let converterWebService: ConverterWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.CONVERTER);
		let resultDocument: RestDocument | undefined = await converterWebService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	};

	let testRestSSLParameter = [
		{
			"type": ServerType.LOCAL,
			"protocol": TransferProtocol.HTTPS,
			"hasError": false,
			"setCertificate": false,
			"selfSigned": true
		},
		{
			"type": ServerType.LOCAL,
			"protocol": TransferProtocol.HTTPS,
			"hasError": true,
			"setCertificate": true,
			"selfSigned": false
		},
		{
			"type": ServerType.LOCAL,
			"protocol": TransferProtocol.HTTPS,
			"hasError": false,
			"setCertificate": true,
			"selfSigned": true
		},
		{
			"type": ServerType.PUBLIC,
			"protocol": TransferProtocol.HTTPS,
			"hasError": false,
			"setCertificate": false,
			"selfSigned": false
		},
		{
			"type": ServerType.PUBLIC,
			"protocol": TransferProtocol.HTTPS,
			"hasError": false,
			"setCertificate": true,
			"selfSigned": false
		},
		{
			"type": ServerType.PUBLIC,
			"protocol": TransferProtocol.HTTPS,
			"hasError": false,
			"setCertificate": false,
			"selfSigned": true
		},
		{
			"type": ServerType.PUBLIC,
			"protocol": TransferProtocol.HTTPS,
			"hasError": false,
			"setCertificate": true,
			"selfSigned": true
		}
	];

	for (let parameter of testRestSSLParameter) {
		it('testRestSSL', async function () {
			if (!TestConfig.instance.getIntegrationTestConfig().isTlsTestsActive()) {
				this.skip();
				return;
			}

			try {
				let url: URL = testServer.getServer(parameter.type, parameter.protocol);
				let peerCertificate: DetailedPeerCertificate | undefined =
					parameter.setCertificate ? await testServer.getDemoCertificate() : undefined;

				console.log("url:", url.href);
				console.log("Parameters:", parameter);

				await testRestSSL(url, peerCertificate, parameter.selfSigned);
				expect(parameter.hasError, "unexpected error code").to.be.false;
			} catch (ex: any) {
				expect(parameter.hasError, "unexpected error code").to.be.true;
			}
		});
	}
});