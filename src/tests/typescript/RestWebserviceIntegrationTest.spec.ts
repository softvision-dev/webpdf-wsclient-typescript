import {expect} from 'chai';
import {ServerType, TestConfig, TestResources, TestServer} from "./testsuite";
import {
	BarcodeWebService,
	ConverterWebService,
	OcrWebService,
	PdfaWebService,
	RestDocument,
	RestSession,
	SessionContext,
	SessionFactory,
	SignatureWebService,
	ToolboxWebService,
	UrlConverterWebService,
	UserAuthProvider,
	WebServiceFactory,
	WebServiceProtocol,
	WebServiceTypes,
	wsclientConfiguration
} from "../../main/typescript";
import {
	AnnotationRectangle,
	Barcode,
	BarcodeInterface,
	BaseToolbox,
	Converter,
	Document,
	ExtractionFileFormat,
	FileDataFormat,
	MergeMode,
	Metrics,
	Ocr,
	OcrInterface,
	OcrLanguage,
	OcrOutput,
	Pdfa,
	PdfaErrorReport,
	PdfaInterface,
	PdfaLevel,
	Signature,
	SignatureImagePosition,
	SignatureInterface,
	ToolboxDelete,
	ToolboxExtraction,
	ToolboxMerge,
	ToolboxRotate,
	ToolboxSecurity,
	UrlConverter,
	UrlConverterInterface,
	UserCredentials
} from "../../main/typescript/generated-sources";

const fs = require('fs');
const tmp = require('tmp');

describe("RestWebserviceIntegrationTest", function () {
	let testResources: TestResources = new TestResources('integration/files');
	let testServer: TestServer = new TestServer();
	tmp.setGracefulCleanup();

	it('testConverter', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let filename: string = "lorem-ipsum.docx";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let webService: ConverterWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.CONVERTER);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		webService.setOperationParameters(
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

		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		expect(resultDocument, "REST document could not be downloaded.").to.exist;
		expect(resultDocument?.getDocumentFile(), "Downloaded REST document is undefined").to.exist;
		expect(filename.split(".")[0]).to.equal(resultDocument?.getDocumentFile().fileName);

		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});

	it('testToolbox', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let filename: string = "lorem-ipsum.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let webService: ToolboxWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.TOOLBOX);

		let mergeFilePath: string = "merge.pdf";
		let mergeFile: string = testResources.getResource(mergeFilePath, {encoding: "base64"}).toString();

		webService.setOperationParameters([
			ToolboxMerge.fromJson({
				merge: {
					page: 1,
					sourceIsZip: false,
					mode: MergeMode.AfterPage,

					// set merge file data
					data: {
						format: FileDataFormat.Pdf,
						value: mergeFile
					}
				}
			} as ToolboxMerge),
			ToolboxRotate.fromJson({
				rotate: {
					pages: "1-5",
					degrees: 90
				},
			} as ToolboxRotate),
			ToolboxDelete.fromJson({
				delete: {
					pages: "5-8"
				},
			}),
			ToolboxSecurity.fromJson({
				security: {
					encrypt: {
						password: {
							open: "büro"
						}
					}
				}
			} as ToolboxSecurity)
		]);

		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});

	it('testToolboxSpecialStructures', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let filename: string = "lorem-ipsum.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let webService: ToolboxWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.TOOLBOX);

		webService.setOperationParameters([
			BaseToolbox.fromJson({
				outline: {
					add: {
						item: [
							{
								itemName: "test",
								actions: [
									{
										goTo: {
											destination: {
												fitPage: {
													page: 1
												}
											}
										}
									}
								]
							}
						]
					}
				}
			})
		]);

		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});

	it('testToolboxExtractionInfo', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let filename: string = "signatur.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let webService: ToolboxWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.TOOLBOX);

		webService.setOperationParameters([
			ToolboxExtraction.fromJson({
				extraction: {
					info: {
						pages: "*",
						fileFormat: ExtractionFileFormat.Json
					}
				}
			})
		]);

		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		let extractionInformation: Document = Document.fromJson(JSON.parse(downloadedFile.toString()).document);
		expect((extractionInformation.form!.field![0].annotation![0].positions![0] as AnnotationRectangle).rectangle).to.exist

		await session.close();
	});

	it('testSignature', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let filename: string = "lorem-ipsum.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let webService: SignatureWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.SIGNATURE);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		let logoFilePath: string = "logo.png";
		let logoFile: string = testResources.getResource(logoFilePath, {encoding: "base64"}).toString();

		webService.setOperationParameters(
			Signature.fromJson({
				add: {
					keyName: "Generic self-signed certificate",
					appearance: {
						page: 1,
						name: "John Doe, Company",
						identifierElements: {
							showCommonName: true,
							showOrganisationName: false,
							showSignedBy: true,
							showCountry: false,
							showMail: false,
							showOrganisationUnit: false
						},
						position: {
							x: 5.0,
							y: 5.0,
							width: 80.0,
							height: 15.0
						},
						image: {
							position: SignatureImagePosition.Left,
							data: {
								value: logoFile
							}
						}
					}
				}
			} as SignatureInterface)
		);

		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});

	it('testPdfa', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let filename: string = "lorem-ipsum.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let webService: PdfaWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.PDFA);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		webService.setOperationParameters(
			Pdfa.fromJson({
				convert: {
					level: PdfaLevel._3b,
					errorReport: PdfaErrorReport.Message,
					imageQuality: 90
				}
			} as PdfaInterface)
		);

		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		expect(resultDocument!.getDocumentFile().metadata!.information.pdfa.part).to.equal("3");
		expect(resultDocument!.getDocumentFile().metadata!.information.pdfa.conformance).to.equal("b");

		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});

	it('testOcr', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let filename: string = "ocr.png";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let webService: OcrWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.OCR);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		webService.setOperationParameters(
			Ocr.fromJson({
				language: OcrLanguage.Eng,
				outputFormat: OcrOutput.Pdf,
				checkResolution: false,
				imageDpi: 200,
				page: {
					height: 210,
					width: 148,
					metrics: Metrics.Mm
				}
			} as OcrInterface)
		);

		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});

	it('testBarcode', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let filename: string = "lorem-ipsum.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let webService: BarcodeWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.BARCODE);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		webService.setOperationParameters(
			Barcode.fromJson({
				add: {
					qrcode: [
						{
							position: {
								x: 2.0,
								y: 2.0,
								height: 20.0,
								width: 20.0
							},
							pages: "1-3",
							value: "https://www.webpdf.de"
						}
					],
					ean8: [
						{
							position: {
								x: 190.0,
								y: 2.0,
								height: 40.0,
								width: 10.0
							},
							value: "90311017",
							pages: "*",
							rotation: 90
						}
					]
				}
			} as BarcodeInterface)
		);

		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();
	});

	it('testUrlConverter', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let webService: UrlConverterWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.URLCONVERTER);
		expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

		webService.setOperationParameters(
			UrlConverter.fromJson({
				url: "https://www.webpdf.de/",
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

	it('testToolboxSwitchToOutputFile', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let filename: string = "lorem-ipsum.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let webService: ToolboxWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.TOOLBOX);
		webService.setOperationParameters([
			BaseToolbox.fromJson({
				image: {
					pages: "1",
					png: {
						dpi: 72
					}
				}
			})
		]);

		let resultDocument: RestDocument | undefined = await webService.process(uploadedFile);
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync({postfix: ".png"});
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;

		await session.close();

		let expectedImagePath: string = "toolbox_image_rest.png";
		let expectedImage: any = testResources.getResource(expectedImagePath);
		expect((downloadedFile).equals(expectedImage), "Content of output file should be identical to test file.").to.be.true;
	});

	it('testToolboxCreateOutputFile', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider(testServer.getLocalUser(), testServer.getLocalPassword())
		);

		let filename: string = "lorem-ipsum.pdf";
		let file: any = testResources.getResource(filename);
		let uploadedFile: RestDocument = await session.getDocumentManager().uploadDocument(file, filename);

		let fileData: Buffer = await uploadedFile.downloadDocument();
		let base64String: string = wsclientConfiguration.btoa(String.fromCharCode(...new Uint8Array(fileData)));

		let webService: ToolboxWebService<RestDocument> = WebServiceFactory.createInstance(session, WebServiceTypes.TOOLBOX);
		webService.getAdditionalParameter().set("name", "portfolio");

		webService.setOperationParameters([
			BaseToolbox.fromJson({
				portfolio: {
					add: {
						file: [
							{
								path: "/",
								fileName: filename,
								data: {
									value: base64String
								}
							}
						]
					}
				}
			})
		]);

		let resultDocument: RestDocument | undefined = await webService.process();
		let downloadedFile: Buffer = await resultDocument!.downloadDocument();

		let fileOut = tmp.fileSync();
		fs.writeFileSync(fileOut.name, downloadedFile);
		expect(fs.existsSync(fileOut.name)).to.be.true;
		expect(resultDocument!.getDocumentId()).to.not.equal(uploadedFile.getDocumentId());
		expect(resultDocument!.getDocumentFile().fileName).to.equal("portfolio");

		await session.close();
	});

	it('testHandleRestSession', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		// Anonymous
		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL))
		);
		expect(session, "Valid session should have been created.").to.exist;
		let user: UserCredentials = await session.getUser();
		expect(user, "UserCredentials should have been initialized.").to.exist;
		expect(user.isUser, "User should be user.").to.be.true;
		expect(user.isAdmin, "User should not be admin.").to.not.be.true;
		expect(user.userName, "Username should be empty.").to.be.empty;
		await session.close();

		// User
		session = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider("user", "user")
		);
		expect(session, "Valid session should have been created.").to.exist;
		user = await session.getUser();
		expect(user, "UserInfo should have been initialized.").to.exist;
		expect(user.isUser, "User should be user.").to.be.true;
		expect(user.isAdmin, "User should not be admin.").to.not.be.true;
		expect(user.userName, "Username should be user.").to.equal("user");
		await session.close();

		// Admin
		session = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider("admin", "admin")
		);
		expect(session, "Valid session should have been created.").to.exist;
		user = await session.getUser();
		expect(user, "UserInfo should have been initialized.").to.exist;
		expect(user.isUser, "User should be user.").to.be.true;
		expect(user.isAdmin, "User should be admin.").to.be.true;
		expect(user.userName, "Username should be admin.").to.equal("admin");
		await session.close();
	});
});

