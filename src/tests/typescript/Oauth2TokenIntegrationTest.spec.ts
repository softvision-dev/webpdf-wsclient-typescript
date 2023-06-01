import {Auth0Config, Auth0Provider, AzureConfig, AzureProvider, ServerType, TestConfig, TestResources, TestServer} from "./testsuite";
import {expect} from "chai";
import {PdfaWebService, RestDocument, RestSession, SessionContext, SessionFactory, WebServiceProtocol, WebServiceTypes} from "../../main/typescript";
import {ConvertPdfa, ConvertPdfaInterface, PdfaErrorReport, PdfaLevel} from "../../main/typescript/generated-sources";

require("./bootstrap");

const fs = require('fs');
const tmp = require('tmp');

describe("Oauth2TokenIntegrationTest", function () {
	let testResources: TestResources = new TestResources('integration/files');
	let testServer: TestServer = new TestServer();

	/**
	 * Executes an exemplary call to the PDF/A webservice and checks whether a result is created and received.
	 *
	 * @param session The {@link RestSession} to use.
	 */
	async function executeWebServiceRequest(session: RestSession<RestDocument>): Promise<void> {
		let webService: PdfaWebService<RestDocument> = session.createWebServiceInstance(WebServiceTypes.PDFA);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		let filename: string = "lorem-ipsum.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		webService.getOperationParameters().convert = ConvertPdfa.fromJson({
			level: PdfaLevel._3b,
			errorReport: PdfaErrorReport.Message,
			imageQuality: 90
		} as ConvertPdfaInterface);

		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;
	}

	/**
	 * <p>
	 * Use an Auth0 authorization provider to create a webPDF wsclient {@link RestSession}.
	 * </p>
	 * <p>
	 * This serves as an example implementation how such an OAuth session can be created.
	 * </p>
	 * <p>
	 * <b>Be aware:</b><br>
	 * - The hereby used Auth0 authorization provider must be known to your webPDF server. (server.xml)
	 * </p>
	 */
	it('testRestAuth0TokenTest', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().getAuth0Config().isEnabled()) {
			this.skip();
			return;
		}

		let auth0Config: Auth0Config = TestConfig.instance.getIntegrationTestConfig().getAuth0Config();

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new Auth0Provider(
				auth0Config.getAuthority(),
				auth0Config.getClientID(),
				auth0Config.getClientSecret(),
				auth0Config.getAudience()
			)
		);
		expect(session, "Valid session should have been created.").to.exist;

		await executeWebServiceRequest(session);

		await session.close();
	});

	/**
	 * <p>
	 * Use an Azure authorization provider to create a webPDF wsclient {@link RestSession}.
	 * </p>
	 * <p>
	 * This serves as an example implementation how such an OAuth session can be created.
	 * </p>
	 * <p>
	 * <b>Be aware:</b><br>
	 * - The hereby used Azure authorization provider must be known to your webPDF server. (server.xml)
	 * </p>
	 */
	it('testRestAzureTokenTest', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().getAzureConfig().isEnabled()) {
			this.skip();
			return;
		}

		let azureConfig: AzureConfig = TestConfig.instance.getIntegrationTestConfig().getAzureConfig();

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new AzureProvider(
				azureConfig.getAuthority(),
				azureConfig.getClientID(),
				azureConfig.getClientSecret(),
				azureConfig.getScope()
			)
		);
		expect(session, "Valid session should have been created.").to.exist;

		await executeWebServiceRequest(session);

		await session.close();
	});
});