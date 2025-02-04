import {ServerType, TestConfig, TestResources, TestServer} from "./testsuite";
import {expect} from "chai";
import {ConverterWebService, RestDocument, RestSession, ServerResultException, SessionContext, SessionFactory, ToolboxWebService, UserAuthProvider, WebServiceFactory, WebServiceProtocol, WebServiceTypes} from "../../main/typescript";
import {BaseToolbox, Signature, SignatureInterface} from "../../main/typescript/generated-sources";
import {it, suite} from "mocha";

suite("RestFailureIntegrationTest", function () {
	let testResources: TestResources = new TestResources('integration/files');
	let testServer: TestServer = new TestServer();

	it('testConverterFailure', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let filename: string = "invalid.gif";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		try {
			let webService: ConverterWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.CONVERTER);
			await webService.process(uploadedFile);
		} catch (ex: any) {
			expect(ex instanceof ServerResultException).to.be.true;
			let error: ServerResultException = ex;
			expect(error.getErrorCode()).to.equal(-106);
		}

		await session.close();
	});

	it('testSignatureFailure', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let filename: string = "lorem-ipsum.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		try {
			let webService: ConverterWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.SIGNATURE);
			webService.setOperationParameters(
				Signature.fromJson({
					add: {
						keyName: "Generic self-signed certificate",
						appearance: {
							page: 2000
						}
					}
				} as SignatureInterface)
			);
			expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;
			await webService.process(uploadedFile);
		} catch (ex: any) {
			expect(ex instanceof ServerResultException).to.be.true;
			let error: ServerResultException = ex;
			expect(error.getErrorCode()).to.equal(-328);
		}

		await session.close();
	});

	it('testPdfaFailure', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let filename: string = "user-owner-password.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		try {
			let webService: ConverterWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.PDFA);
			await webService.process(uploadedFile);
		} catch (ex: any) {
			expect(ex instanceof ServerResultException).to.be.true;
			let error: ServerResultException = ex;
			expect(error.getErrorCode()).to.equal(-21);
		}

		await session.close();
	});

	it('testToolboxFailure', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let filename: string = "user-owner-password.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		try {
			let webService: ToolboxWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.TOOLBOX);
			webService.setOperationParameters([
				BaseToolbox.fromJson({
					extraction: {
						text: {
							pages: "2000"
						}
					}
				})
			]);
			await webService.process(uploadedFile);
		} catch (ex: any) {
			expect(ex instanceof ServerResultException).to.be.true;
			let error: ServerResultException = ex;
			expect(error.getErrorCode()).to.equal(-5009);
		}

		await session.close();
	});

	it('testUrlConverterFailure', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let filename: string = "lorem-ipsum.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		try {
			let webService: ConverterWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.URLCONVERTER);
			await webService.process(uploadedFile);
		} catch (ex: any) {
			expect(ex instanceof ServerResultException).to.be.true;
			let error: ServerResultException = ex;
			expect(error.getErrorCode()).to.equal(-58);
		}

		await session.close();
	});

	it('testOCRFailure', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let filename: string = "user-owner-password.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		try {
			let webService: ConverterWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.OCR);
			await webService.process(uploadedFile);
		} catch (ex: any) {
			expect(ex instanceof ServerResultException).to.be.true;
			let error: ServerResultException = ex;
			expect(error.getErrorCode()).to.equal(-5009);
		}

		await session.close();
	});
});