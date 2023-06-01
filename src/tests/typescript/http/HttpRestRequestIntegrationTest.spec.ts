import {ServerType, TestConfig, TestResources, TestServer} from "../testsuite";
import {expect} from "chai";
import {ClientResultException, HttpMethod, HttpRestRequest, RestDocument, RestSession, ResultException, SessionContext, SessionFactory, UserAuthProvider, WebServiceProtocol, wsclientConfiguration, WsclientErrors} from "../../../main/typescript";
import {DocumentFile} from "../../../main/typescript/generated-sources";
import {AxiosResponse} from "axios";

require("../bootstrap");

describe("HttpRestRequestIntegrationTest", function () {
	let testResources: TestResources = new TestResources('http');
	let testServer: TestServer = new TestServer();

	it('testWithCredentials', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);
		expect(session, "Valid session should have been created.").to.exist;

		let sourceFilename: string = "test.pdf";
		let sourceFile: any = testResources.getResource(sourceFilename);

		let httpRestRequest: HttpRestRequest = HttpRestRequest.createRequest(session);
		expect(httpRestRequest, "HttpRestRequest should have been build.").to.exist;

		let formData: FormData = new wsclientConfiguration.FormData();
		formData.append('filedata', sourceFile, sourceFilename);
		expect(formData, "FormData should have been build.").to.exist;

		await httpRestRequest.buildRequest(HttpMethod.POST, session.getURL("documents/"), formData);
		let response: DocumentFile = new DocumentFile(await httpRestRequest.executeRequest());
		expect(response, "Uploaded file should not be null.").to.exist;
		expect(response.fileName, "Uploaded filename is incorrect.").to.equal("test");
		expect(response.mimeType, "Uploaded MimeType is incorrect.").to.equal("application/pdf");

		httpRestRequest = HttpRestRequest.createRequest(session);
		expect(httpRestRequest, "HttpRestRequest should have been build.").to.exist;

		httpRestRequest.setAcceptHeader("application/octet-stream");
		await httpRestRequest.buildRequest(HttpMethod.GET, session.getURL("documents/" + response.documentId));
		let downloadedFile: AxiosResponse = await httpRestRequest.execute();

		expect(sourceFile.equals(downloadedFile.data), "Content of output file should be identical to test file.").to.be.true;

		await session.close();
	});

	it('testWithInvalidCredentials', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		try {
			let session: RestSession<RestDocument> = await SessionFactory.createInstance(
				new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
				new UserAuthProvider("invalid", "invalid")
			);

			await session.getUser();
			expect.fail(true, false, "The login itself shall fail and this line should never be reached.");
		} catch (e: any) {
			expect(e instanceof ResultException).to.be.true;

			let error: ResultException = e;
			expect(
				error.getErrorCode(), "An Authorization failure error should be thrown"
			).to.equal(WsclientErrors.AUTH_ERROR.getCode());
		}
	});

	it('testNullEntity', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let httpRestRequest: HttpRestRequest = HttpRestRequest.createRequest(session);
		expect(httpRestRequest, "HttpRestRequest should have been build.").to.exist;

		await httpRestRequest.buildRequest(HttpMethod.POST, session.getURL("documents/"));

		try {
			new DocumentFile(await httpRestRequest.executeRequest());
			expect.fail(true, false, "this should never be reached");
		} catch (e: any) {
			expect(e instanceof ClientResultException).to.be.true;

			let error: ClientResultException = e;
			expect(error.getErrorCode(), "A HTTP custom error should be thrown").to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getCode());
			expect(error.getHttpErrorCode(), "HTTP error code 415 should be thrown").to.equal(415);
		}

		await session.close();
	});
});