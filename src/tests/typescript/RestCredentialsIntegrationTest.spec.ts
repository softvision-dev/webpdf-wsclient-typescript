import {ServerType, TestConfig, TestResources, TestServer} from "./testsuite";
import {expect} from "chai";
import {ConverterWebService, RestDocument, RestSession, SessionContext, SessionFactory, UserAuthProvider, WebServiceFactory, WebServiceProtocol, WebServiceTypes} from "../../main/typescript";
import {Converter, PdfaErrorReport, PdfaLevel} from "../../main/typescript/generated-sources";
import {it, suite} from "mocha";

const fs = require('fs');
const tmp = require('tmp');

suite("RestCredentialsIntegrationTest", function () {
	let testResources: TestResources = new TestResources('integration/files');
	let testServer: TestServer = new TestServer();
	tmp.setGracefulCleanup();

	it('testWithUserCredentials', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let converterWebService: ConverterWebService<RestDocument> = session.createWebServiceInstance(WebServiceTypes.CONVERTER);
		expect(converterWebService.getOperationParameters(), "Operation should have been initialized").to.exist;
		converterWebService.setOperationParameters(
			Converter.fromJson({
				pages: "1-5",
				embedFonts: true,
				pdfa: {
					convert: {
						level: PdfaLevel._3b,
						errorReport: PdfaErrorReport.Message
					}
				}
			} as Converter)
		);

		let filename: string = "lorem-ipsum.docx";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);
		let resultDocument: RestDocument | undefined = await converterWebService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});

	it('testWithSetOptions', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let webService: ConverterWebService<RestDocument> = WebServiceFactory.createByParameters(session, {
			"converter": {
				"embedFonts": "true",
				"pages": "1-5",
				"pdfa": {
					"convert": {
						"level": "3b",
						"errorReport": "message"
					}
				}
			}
		});

		let filename: string = "lorem-ipsum.docx";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);
		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});
});