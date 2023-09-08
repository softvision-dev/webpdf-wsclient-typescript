import {ServerType, TestConfig, TestResources, TestServer} from "../testsuite";
import {expect} from "chai";
import {
	ConverterWebService,
	RestDocument,
	RestSession,
	ServerResultException,
	SessionContext,
	SessionFactory,
	ToolboxWebService,
	UserAuthProvider,
	WebServiceFactory,
	WebServiceProtocol,
	WebServiceTypes
} from "../../../main/typescript";
import {
	BaseToolbox,
	FileCompress,
	FileCompressInterface,
	FileDataSource,
	FileExtract,
	FileExtractInterface,
	FileFilterType,
	HistoryEntry,
	InfoForm,
	InfoType,
	PdfPassword,
	PdfPasswordInterface
} from "../../../main/typescript/generated-sources";

require("../bootstrap");

describe("DocumentManagerIntegrationTest", function (): void {
	let testResources: TestResources = new TestResources('documents');
	let testServer: TestServer = new TestServer();

	it('testHandleDocument', async function (): Promise<void> {
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
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentId()).to.exist;

		uploadedFile = await session.getDocumentManager().getDocument(uploadedFile.getDocumentId());
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentId()).to.exist;

		let downloadedFile: any = await uploadedFile.downloadDocument();
		expect(sourceFile.toString() === downloadedFile.toString(), "The content of the uploaded and the downloaded document should have been equal.").to.be.true;

		let fileList: Array<RestDocument> = await session.getDocumentManager().getDocuments();
		expect(fileList.length, "file list should contain 1 document.").to.equal(1);

		await uploadedFile.deleteDocument();

		fileList = await session.getDocumentManager().getDocuments();
		expect(fileList.length, "file list should be empty.").to.equal(0);

		await session.close();
	});

	it('testDocumentRename', async function (): Promise<void> {
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
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentId()).to.exist;
		expect(uploadedFile.getDocumentFile().fileName, "Filename should be test").to.equal("test");

		uploadedFile = await uploadedFile.renameDocument("new");
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentFile().fileName, "Filename should be new").to.equal("new");

		await session.close();
	});

	it('testDocumentList', async function (): Promise<void> {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);
		expect(session, "Valid session should have been created.").to.exist;

		let sourceFileName1: string = "test.pdf";
		let sourceFile1: any = testResources.getResource(sourceFileName1);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile1, sourceFileName1);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;

		let sourceFileName2: string = "logo.png";
		let sourceFile2: any = testResources.getResource(sourceFileName2);
		uploadedFile = await session.getDocumentManager().uploadDocument(sourceFile2, sourceFileName2);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;

		let sourceFileName3: string = "lorem-ipsum.txt";
		let sourceFile3: any = testResources.getResource(sourceFileName3);
		uploadedFile = await session.getDocumentManager().uploadDocument(sourceFile3, sourceFileName3);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;

		let fileList: Array<RestDocument> = await session.getDocumentManager().getDocuments();
		expect(fileList.length, "file list should contain 3 documents.").to.equal(3);

		await session.close();
	});

	it('testDocumentHistory', async function (): Promise<void> {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);
		expect(session, "Valid session should have been created.").to.exist;

		session.getDocumentManager().setDocumentHistoryActive(true);

		let sourceFileName: string = "logo.png";
		let sourceFile: any = testResources.getResource(sourceFileName);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFileName);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentFile(), "Valid document file should have been contained.").to.exist;

		let historyList: Array<HistoryEntry> = await session.getDocumentManager().getDocumentHistory(uploadedFile.getDocumentId());
		expect(historyList.length, "history list should contain 1 element.").to.equal(1);

		let historyEntry: HistoryEntry = historyList.pop()!;
		expect(historyEntry.operation, "history operation should be \"\".").to.equal("");

		historyEntry.operation = "File uploaded";
		historyEntry = await session.getDocumentManager().updateDocumentHistory(uploadedFile.getDocumentId(), historyEntry);
		expect(historyEntry, "History entry should have been updated.").to.exist;
		expect(historyEntry.operation, "history operation should be \"File uploaded\".").to.equal("File uploaded");

		let webService: ConverterWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.CONVERTER);
		await webService.process(uploadedFile);
		historyList = session.getDocumentManager().getDocumentHistory(uploadedFile.getDocumentId());
		expect(historyList.length, "history list should contain 2 elements.").to.equal(2);

		historyEntry = historyList.pop()!;
		historyEntry.operation = "File converted";
		historyEntry = await session.getDocumentManager().updateDocumentHistory(uploadedFile.getDocumentId(), historyEntry);
		expect(historyEntry, "History entry should have been updated.").to.exist;
		expect(historyEntry.operation, "history operation should be changed to \"File converted\".").to.equal("File converted");
		expect(uploadedFile.getDocumentFile().mimeType, "Filetype should be application/pdf").to.equal("application/pdf");

		historyEntry = historyList[0];
		historyEntry.active = true;
		await session.getDocumentManager().updateDocumentHistory(uploadedFile.getDocumentId(), historyEntry);
		expect(uploadedFile.getDocumentFile().mimeType, "Filetype should be image/png").to.equal("image/png");

		await session.close();
	});

	it('testHandleDocumentByID', async function (): Promise<void> {
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
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;

		let downloadedFile: any = await uploadedFile.downloadDocument();
		expect(sourceFile.toString() === downloadedFile.toString(), "The content of the uploaded and the downloaded document should have been equal.").to.be.true;

		await session.close();
	});

	it('testDocumentSecurityTextPassword', async function (): Promise<void> {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);
		expect(session, "Valid session should have been created.").to.exist;

		let sourceFilename: string = "security/password/password.pdf";
		let sourceFile: any = testResources.getResource(sourceFilename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentFile().error?.errorCode, "errorcode should be -5009").to.equal(-5009);

		let passwordType: PdfPassword = PdfPassword.fromJson({
			open: "a"
		} as PdfPasswordInterface);

		uploadedFile = await uploadedFile.updateDocumentSecurity(passwordType);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentFile().error?.errorCode, "errorcode should be 0").to.equal(0);

		await session.close();
	});

	it('testDocumentSecurityCertificate', async function (): Promise<void> {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);
		expect(session, "Valid session should have been created.").to.exist;

		let sourceFilename: string = "security/certificate/protected_certificate.pdf";
		let sourceFile: any = testResources.getResource(sourceFilename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentFile().error?.errorCode, "errorcode should be -5055").to.equal(-5055);

		let certificate: Buffer = testResources.getResource("security/certificate/heinz_mustermann_certificate.pem");
		let privateKey: Buffer = testResources.getResource("security/certificate/heinz_mustermann_private.pem");
		let passwordType: PdfPassword = PdfPassword.fromJson({
			keyPair: {
				certificate: {
					source: FileDataSource.Value,
					value: certificate.toString()
				},
				privateKey: {
					source: FileDataSource.Value,
					value: privateKey.toString(),
					password: "geheim"
				}
			}
		} as PdfPassword);

		uploadedFile = await uploadedFile.updateDocumentSecurity(passwordType);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentFile().error?.errorCode, "errorcode should be 0").to.equal(0);

		await session.close();
	});

	it('testDocumentListFromSession', async function (): Promise<void> {
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
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;

		let fileList: Array<RestDocument> = await session.getDocumentManager().getDocuments();
		expect(fileList.length, "file list should contain 1 document.").to.equal(1);

		let resumedSession: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(
				testServer.getLocalUserName(), testServer.getLocalUserPassword(), await session.getAuthProvider().provide(session)
			)
		);

		await resumedSession.getAuthProvider().refresh(resumedSession);

		fileList = resumedSession.getDocumentManager().getDocuments();
		expect(fileList.length, "file list should contain 0 documents.").to.equal(0);

		fileList = await resumedSession.getDocumentManager().synchronize();
		expect(fileList.length, "file list should contain 1 document.").to.equal(1);

		await resumedSession.close();
	});

	it('testDocumentPasswordHandling', async function (): Promise<void> {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);

		let sourceFilename: string = "test.pdf";
		let sourceFile: any = testResources.getResource(sourceFilename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);

		let openPassword: string = "open";
		let permissionPassword: string = "permission";

		// encrypt document
		let toolboxWebService: ToolboxWebService<RestDocument> = WebServiceFactory.createInstance(
			session, WebServiceTypes.TOOLBOX
		);

		toolboxWebService.setOperationParameters([
			BaseToolbox.fromJson({
				security: {
					encrypt: {
						password: {
							open: openPassword,
							permission: permissionPassword
						}
					}
				}
			})
		]);

		let encryptedDocument: RestDocument | undefined = await toolboxWebService.process(uploadedFile);
		expect(encryptedDocument!.getDocumentFile().error!.errorCode, "The document password should be set").to.equal(0);
		expect(encryptedDocument!.getDocumentFile().metadata!.information, "The metadata should be readable").to.exist;

		// rotate pages with initially set password
		let rotationParameter: Array<BaseToolbox> = [
			BaseToolbox.fromJson({
				rotate: {
					degrees: 90
				}
			})
		];

		toolboxWebService = WebServiceFactory.createInstance(session, WebServiceTypes.TOOLBOX);
		toolboxWebService.setOperationParameters(rotationParameter);
		await toolboxWebService.process(encryptedDocument);

		// set wrong password
		let passwordType: PdfPassword = PdfPassword.fromJson({
			open: "wrong"
		} as PdfPassword);
		let openedDocument: RestDocument | undefined = await encryptedDocument?.updateDocumentSecurity(passwordType);
		expect(openedDocument!.getDocumentFile().error!.errorCode, "The document password should be wrong.").to.equal(-5008);
		expect(openedDocument!.getDocumentFile().metadata!.information, "The metadata should not be readable.").to.not.exist;

		// rotate pages with wrong password
		toolboxWebService = WebServiceFactory.createInstance(session, WebServiceTypes.TOOLBOX);
		toolboxWebService.setOperationParameters(rotationParameter);

		try {
			await toolboxWebService.process(openedDocument);
		} catch (ex: any) {
			expect(ex instanceof ServerResultException).to.be.true;
			let error: ServerResultException = ex;
			expect(error.getClientError().getCode()).to.equal(-53);
			expect(error.getErrorCode()).to.equal(-5008);
		}

		// rotate pages with correct temporary password
		toolboxWebService = WebServiceFactory.createInstance(session, WebServiceTypes.TOOLBOX);
		toolboxWebService.setPassword(PdfPassword.fromJson({
			open: openPassword,
			permission: permissionPassword
		} as PdfPasswordInterface));
		toolboxWebService.setOperationParameters(rotationParameter);
		await toolboxWebService.process(openedDocument);

		// set correct password
		passwordType = PdfPassword.fromJson({
			open: openPassword,
			permission: permissionPassword
		});
		openedDocument = await encryptedDocument?.updateDocumentSecurity(passwordType);

		// rotate pages with correct password
		toolboxWebService = WebServiceFactory.createInstance(session, WebServiceTypes.TOOLBOX);
		toolboxWebService.setOperationParameters(rotationParameter);
		await toolboxWebService.process(openedDocument);

		await session.close();
	});

	it('testDocumentInfo', async function (): Promise<void> {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);
		expect(session, "Valid session should have been created.").to.exist;

		let sourceFilename: string = "form.pdf";
		let sourceFile: any = testResources.getResource(sourceFilename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;

		let formInfo: InfoForm = await uploadedFile.getDocumentInfo(InfoType.Form);
		expect(formInfo, "Form info should have been fetched").to.exist;
		expect(formInfo.infoType, "Info type should be form").to.equal(InfoType.Form);
		expect(formInfo.value, "There should be a value").to.not.be.empty;

		await session.close();
	});

	it('testDocumentExtractAll', async function (): Promise<void> {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);
		expect(session, "Valid session should have been created.").to.exist;

		let sourceFilename: string = "files.zip";
		let sourceFile: any = testResources.getResource(sourceFilename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentId()).to.exist;

		let unzippedFiles: Array<RestDocument> = await uploadedFile.extractDocument(new FileExtract({}));
		expect(unzippedFiles, "Valid documents should have been returned.").to.exist;
		expect(unzippedFiles.length, "There should be 3 result documents.").to.equal(3);

		await session.close();
	});

	it('testDocumentExtractWithFilter', async function (): Promise<void> {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);
		expect(session, "Valid session should have been created.").to.exist;

		let sourceFilename: string = "files.zip";
		let sourceFile: any = testResources.getResource(sourceFilename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;
		expect(uploadedFile.getDocumentId()).to.exist;

		let fileExtract: FileExtract = new FileExtract({
			fileFilter: {
				includeRules: [
					{
						rulePattern: "logo.png",
						ruleType: FileFilterType.Glob
					}
				]
			}
		} as FileExtractInterface);

		let unzippedFiles: Array<RestDocument> = await uploadedFile.extractDocument(fileExtract);
		expect(unzippedFiles, "Valid documents should have been returned.").to.exist;
		expect(unzippedFiles.length, "There should be 1 result document.").to.equal(1);

		await session.close();
	});

	it('testDocumentCompress', async function (): Promise<void> {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);
		expect(session, "Valid session should have been created.").to.exist;

		let documentIdList: Array<string> = [];
		let sourceFilenames: Array<string> = ["test.pdf", "logo.png", "lorem-ipsum.txt"];
		for (let sourceFilename of sourceFilenames) {
			let sourceFile: any = testResources.getResource(sourceFilename);
			let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
			expect(uploadedFile, "Valid document should have been returned.").to.exist;
			expect(uploadedFile.getDocumentId()).to.exist;

			documentIdList.push(uploadedFile.getDocumentId());
		}

		let fileCompress: FileCompress = new FileCompress({
			documentIdList: documentIdList,
			archiveFileName: "archive"
		} as FileCompressInterface);

		let resultDocument: RestDocument = await session.getDocumentManager().compressDocuments(fileCompress);
		expect(resultDocument, "Valid document should have been returned.").to.exist;
		expect(resultDocument.getDocumentFile().mimeType).to.equal("application/zip");

		await session.close();
	});

	it('testDocumentUpdate', async function (): Promise<void> {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
		);
		expect(session, "Valid session should have been created.").to.exist;

		let sourceFilename: string = "lorem-ipsum.txt";
		let sourceFile: any = testResources.getResource(sourceFilename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(sourceFile, sourceFilename);
		expect(uploadedFile, "Valid document should have been returned.").to.exist;

		let fileContent: string = "This is test content";
		let newData: any = Buffer.from(fileContent);

		let updatedFile: RestDocument = await uploadedFile.updateDocument(newData);
		expect(updatedFile, "Valid document should have been returned.").to.exist;

		let downloadedFile: Buffer = await updatedFile.downloadDocument();
		expect(downloadedFile.toString(), "content should equal \"" + fileContent + "\"").to.equal(fileContent);

		await session.close();
	});
});