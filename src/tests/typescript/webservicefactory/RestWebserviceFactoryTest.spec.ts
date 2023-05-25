import {ServerType, TestConfig, TestResources, TestServer} from "../testsuite";
import {expect} from "chai";
import {
	BarcodeWebService,
	ConverterWebService,
	OcrWebService,
	PdfaWebService,
	RestDocument,
	RestSession,
	RestWebService,
	SessionContext,
	SessionFactory,
	SignatureWebService,
	ToolboxWebService,
	UrlConverterWebService,
	WebServiceFactory,
	WebServiceProtocol,
	WebServiceType,
	WebServiceTypes
} from "../../../main/typescript";
import {
	BarcodeOperation,
	CertificationLevel,
	ConverterOperation,
	Metrics,
	OcrLanguage,
	OcrOperation,
	OcrOutput,
	PageGroup,
	PageOrientation,
	PdfaErrorReport,
	PdfaLevel,
	PdfaOperation,
	PdfaSuccessReport,
	QrCodeErrorCorrection,
	SignatureOperation,
	ToolboxDelete,
	ToolboxOperation,
	ToolboxRotate,
	ToolboxWatermark,
	UrlConverterOperation
} from "../../../main/typescript/generated-sources";

describe("RestWebserviceFactoryTest", function () {
	let testResources: TestResources = new TestResources('webservicefactory');
	let testServer: TestServer = new TestServer();

	let getWebService = async function <T extends RestWebService<any, any, RestDocument>>(webServiceType: WebServiceType): Promise<T> {
		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL))
		);

		// @ts-ignore
		return WebServiceFactory.createInstance(session, webServiceType);
	};

	let getTypedWebservice = async function <T extends RestWebService<any, any, RestDocument>>(
		expectedType: Function, webServiceType: WebServiceType, parameters: any
	): Promise<T> {
		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL))
		);
		let webService: T = WebServiceFactory.createInstance(session, webServiceType);
		webService.setOperationParameters(parameters);

		expect(webService, "webservice should have been instantiated.").to.exist;
		expect(webService.getOperationParameters(), "Operation data should have been initialized").to.exist;
		return webService;
	};

	it('testFactoryBarcodeFromFile', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let configFile: object = JSON.parse(testResources.getResource("barcode.json", "utf8").toString());
		let webService: BarcodeWebService<RestDocument> = await getTypedWebservice(
			BarcodeWebService, WebServiceTypes.BARCODE, BarcodeOperation.fromJson(configFile).barcode
		);
		expect(webService.getOperationParameters().add, "Add element should have been created.").to.exist;
		expect(webService.getOperationParameters().add!.qrcode, "QR-code element should have been created.").to.exist;
		expect(webService.getOperationParameters().add!.qrcode!.length, "Number of added QR-codes is incorrect.").to.equal(1);
		expect(webService.getOperationParameters().add!.qrcode![0].value, "Value of value attribute is unexpected.").to.equal("webPDFTest");
		expect(webService.getOperationParameters().add!.qrcode![0].pages, "Value of pages attribute is unexpected.").to.equal("1");
		expect(webService.getOperationParameters().add!.qrcode![0].rotation, "Value of rotation attribute is unexpected.").to.equal(90);
		expect(webService.getOperationParameters().add!.qrcode![0].charset, "Value of charset attribute is unexpected.").to.equal("utf-8");
		expect(webService.getOperationParameters().add!.qrcode![0].errorCorrection, "Value of errorCorrection attribute is unexpected.").to.equal(QrCodeErrorCorrection.M);
		expect(webService.getOperationParameters().add!.qrcode![0].margin, "Value of margin attribute is unexpected.").to.equal(1);
	});

	it('testFactoryConverterFromFile', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let configFile: object = JSON.parse(testResources.getResource("convert.json", "utf8").toString());
		let webService: ConverterWebService<RestDocument> = await getTypedWebservice(
			ConverterWebService, WebServiceTypes.CONVERTER, ConverterOperation.fromJson(configFile).converter
		);
		expect(webService.getOperationParameters().embedFonts, "Value of embedFonts attribute is unexpected.").is.true;
		expect(webService.getOperationParameters().pages, "Value of pages attribute is unexpected.").is.equal("1");
		expect(webService.getOperationParameters().reduceResolution, "Value of reduceResolution attribute is unexpected.").is.true;
		expect(webService.getOperationParameters().maxRecursion, "Value of maxRecursion attribute is unexpected.").is.equal(2);
		expect(webService.getOperationParameters().jpegQuality, "Value of jpegQuality attribute is unexpected.").is.equal(3);
		expect(webService.getOperationParameters().fileExtension, "Value of fileExtension attribute is unexpected.").is.equal("zip");
		expect(webService.getOperationParameters().dpi, "Value of dpi attribute is unexpected.").is.equal(4);
		expect(webService.getOperationParameters().compression, "Value of compression attribute is unexpected.").is.false;
		expect(webService.getOperationParameters().accessPassword, "Value of accessPassword attribute is unexpected.").is.equal("testPwd");
		expect(webService.getOperationParameters().pdfa, "Pdfa element should have been created.").to.exist;
		expect(webService.getOperationParameters().pdfa!.convert, "Convert element should have been created.").to.exist;
		expect(webService.getOperationParameters().pdfa!.convert!.level, "Value of level attribute is unexpected.").is.equal(PdfaLevel._1a);
		expect(webService.getOperationParameters().pdfa!.convert!.errorReport, "Value of errorReport attribute is unexpected.").is.equal(PdfaErrorReport.Message);
		expect(webService.getOperationParameters().pdfa!.convert!.imageQuality, "Value of imageQuality attribute is unexpected.").is.equal(1);
		expect(webService.getOperationParameters().pdfa!.convert!.successReport, "Value of successReport attribute is unexpected.").is.equal(PdfaSuccessReport.Zip);
	});

	it('testFactoryOCRFromFile', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let configFile: object = JSON.parse(testResources.getResource("ocr.json", "utf8").toString());
		let webService: OcrWebService<RestDocument> = await getTypedWebservice(
			OcrWebService, WebServiceTypes.OCR, OcrOperation.fromJson(configFile).ocr
		);
		expect(webService.getOperationParameters().checkResolution, "Value of checkResolution attribute is unexpected.").is.false;
		expect(webService.getOperationParameters().forceEachPage, "Value of forceEachPage attribute is unexpected.").is.true;
		expect(webService.getOperationParameters().imageDpi, "Value of imageDpi attribute is unexpected.").is.equal(1);
		expect(webService.getOperationParameters().language, "Value of language attribute is unexpected.").is.equal(OcrLanguage.Fra);
		expect(webService.getOperationParameters().outputFormat, "Value of outputFormat attribute is unexpected.").is.equal(OcrOutput.Pdf);
		expect(webService.getOperationParameters().page, "Page element should have been created.").to.exist;
		expect(webService.getOperationParameters().page!.width, "Value of width attribute is unexpected.").is.equal(1);
		expect(webService.getOperationParameters().page!.height, "Value of height attribute is unexpected.").is.equal(2);
		expect(webService.getOperationParameters().page!.metrics, "Value of metrics attribute is unexpected.").is.equal(Metrics.Mm);
	});

	it('testFactoryPDFAFromFile', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let configFile: object = JSON.parse(testResources.getResource("pdfa.json", "utf8").toString());
		let webService: PdfaWebService<RestDocument> = await getTypedWebservice(
			PdfaWebService, WebServiceTypes.PDFA, PdfaOperation.fromJson(configFile).pdfa!
		);
		expect(webService.getOperationParameters().analyze, "Analyze element should have been created.").to.exist;
		expect(webService.getOperationParameters().analyze!.level, "Value of level attribute is unexpected.").is.equal(PdfaLevel._1a);
	});

	it('testFactorySignatureFromFile', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let configFile: object = JSON.parse(testResources.getResource("signature.json", "utf8").toString());
		let webService: SignatureWebService<RestDocument> = await getTypedWebservice(
			SignatureWebService, WebServiceTypes.SIGNATURE, SignatureOperation.fromJson(configFile).signature!
		);
		expect(webService.getOperationParameters().add, "Add element should have been created.").to.exist;
		expect(webService.getOperationParameters().add!.location, "Value of location attribute is unexpected.").is.equal("testLocation");
		expect(webService.getOperationParameters().add!.appendSignature, "Value of appendSignature attribute is unexpected.").is.true;
		expect(webService.getOperationParameters().add!.certificationLevel, "Value of certificationLevel attribute is unexpected.").is.equal(CertificationLevel.None);
		expect(webService.getOperationParameters().add!.contact, "Value of contact attribute is unexpected.").is.equal("testContact");
		expect(webService.getOperationParameters().add!.fieldName, "Value of fieldName attribute is unexpected.").is.equal("testName");
		expect(webService.getOperationParameters().add!.keyName, "Value of keyName attribute is unexpected.").is.equal("testKey");
		expect(webService.getOperationParameters().add!.keyPassword, "Value of keyPassword attribute is unexpected.").is.equal("testPwd");
		expect(webService.getOperationParameters().add!.reason, "Value of reason attribute is unexpected.").is.equal("testReason");
		expect(webService.getOperationParameters().add!.appearance, "Appearance element should have been created.").to.exist;
		expect(webService.getOperationParameters().add!.appearance!.page, "Value of page attribute is unexpected.").is.equal(1);
		expect(webService.getOperationParameters().add!.appearance!.name, "Value of name attribute is unexpected.").is.equal("testName");
		expect(webService.getOperationParameters().add!.appearance!.identifier, "Value of identifier attribute is unexpected.").is.equal("testIdentifier");
	});

	it('testFactoryToolboxFromFile', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let configFile: object = JSON.parse(testResources.getResource("toolbox.json", "utf8").toString());
		let webService: ToolboxWebService<RestDocument> = await getTypedWebservice(
			ToolboxWebService, WebServiceTypes.TOOLBOX, ToolboxOperation.fromJson(configFile).toolbox!
		);

		let deleteOptions: ToolboxDelete = webService.getOperationParameters()[0] as ToolboxDelete;
		expect(deleteOptions, "Operation should have been initialized.").to.exist;
		expect(deleteOptions._delete, "Delete element should have been created.").to.exist;
		expect(deleteOptions._delete!.pages, "Value of pages attribute is unexpected.").is.equal("1");

		let rotateOptions: ToolboxRotate = webService.getOperationParameters()[1] as ToolboxRotate;
		expect(rotateOptions, "Rotate element should have been created.").to.exist;
		expect(rotateOptions.rotate!.pages, "Value of pages attribute is unexpected.").is.equal("*");
		expect(rotateOptions.rotate!.degrees, "Value of degrees attribute is unexpected.").is.equal(90);
		expect(rotateOptions.rotate!.pageGroup, "Value of pageGroup attribute is unexpected.").is.equal(PageGroup.Even);
		expect(rotateOptions.rotate!.pageOrientation, "Value of pageOrientation attribute is unexpected.").is.equal(PageOrientation.Any);

		let watermarkOptions: ToolboxWatermark = webService.getOperationParameters()[2] as ToolboxWatermark;
		expect(watermarkOptions.watermark, "Watermark element should have been created.").to.exist;
		expect(watermarkOptions.watermark!.pages, "Value of pages attribute is unexpected.").is.equal("2");
		expect(watermarkOptions.watermark!.angle, "Value of angle attribute is unexpected.").is.equal(180);
		expect(watermarkOptions.watermark!.text, "Text element should have been created.").to.exist;
		expect(watermarkOptions.watermark!.text!.text, "Value of text attribute is unexpected.").is.equal("testText");
	});

	it('testFactoryUrlConverterFromFile', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let configFile: object = JSON.parse(testResources.getResource("url_convert.json", "utf8").toString());
		let webService: UrlConverterWebService<RestDocument> = await getTypedWebservice(
			UrlConverterWebService, WebServiceTypes.URLCONVERTER, UrlConverterOperation.fromJson(configFile).urlconverter!
		);
		expect(webService.getOperationParameters().url, "Value of url attribute is unexpected.").is.equal("testURL");
		expect(webService.getOperationParameters().page, "Page element should have been created.").to.exist;
		expect(webService.getOperationParameters().page!.metrics, "Value of metrics attribute is unexpected.").is.equal(Metrics.Mm);
		expect(webService.getOperationParameters().page!.height, "Value of height attribute is unexpected.").is.equal(1);
		expect(webService.getOperationParameters().page!.width, "Value of width attribute is unexpected.").is.equal(2);
		expect(webService.getOperationParameters().page!.bottom, "Value of bottom attribute is unexpected.").is.equal(3);
		expect(webService.getOperationParameters().page!.left, "Value of left attribute is unexpected.").is.equal(4);
		expect(webService.getOperationParameters().page!.right, "Value of right attribute is unexpected.").is.equal(5);
		expect(webService.getOperationParameters().page!.top, "Value of top attribute is unexpected.").is.equal(6);
		expect(webService.getOperationParameters().basicAuth, "BasicAuth element should have been created.").to.exist;
		expect(webService.getOperationParameters().basicAuth!.password, "Value of password attribute is unexpected.").is.equal("testPwd");
		expect(webService.getOperationParameters().basicAuth!.userName, "Value of userName attribute is unexpected.").is.equal("testUser");
		expect(webService.getOperationParameters().proxy, "Proxy element should have been created.").to.exist;
		expect(webService.getOperationParameters().proxy!.userName, "Value of userName attribute is unexpected.").is.equal("testUser");
		expect(webService.getOperationParameters().proxy!.password, "Value of password attribute is unexpected.").is.equal("testPwd");
		expect(webService.getOperationParameters().proxy!.address, "Value of address attribute is unexpected.").is.equal("testAddress");
		expect(webService.getOperationParameters().proxy!.port, "Value of port attribute is unexpected.").is.equal(1);
	});

	it('testFactoryCreateWebserviceInstance', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isIntegrationTestsActive()) {
			this.skip();
			return;
		}

		let toolboxWebService: ToolboxWebService<RestDocument> = await getWebService(WebServiceTypes.TOOLBOX);
		expect(toolboxWebService, "The toolbox webservice should have been initialized.").to.exist;
		expect(toolboxWebService.getOperationParameters(), "The toolbox operation should have been initialized.").to.exist;

		let converterWebService: ConverterWebService<RestDocument> = await getWebService(WebServiceTypes.CONVERTER);
		expect(converterWebService, "The converter webservice should have been initialized.").to.exist;
		expect(converterWebService.getOperationParameters(), "The converter operation should have been initialized.").to.exist;

		let signatureWebService: SignatureWebService<RestDocument> = await getWebService(WebServiceTypes.SIGNATURE);
		expect(signatureWebService, "The signature webservice should have been initialized.").to.exist;
		expect(signatureWebService.getOperationParameters(), "The signature operation should have been initialized.").to.exist;

		let barcodeWebService: BarcodeWebService<RestDocument> = await getWebService(WebServiceTypes.BARCODE);
		expect(barcodeWebService, "The barcode webservice should have been initialized.").to.exist;
		expect(barcodeWebService.getOperationParameters(), "The barcode operation should have been initialized.").to.exist;

		let pdfaWebService: PdfaWebService<RestDocument> = await getWebService(WebServiceTypes.PDFA);
		expect(pdfaWebService, "The pdfa webservice should have been initialized.").to.exist;
		expect(pdfaWebService.getOperationParameters(), "The pdfa operation should have been initialized.").to.exist;

		let urlConverterWebService: UrlConverterWebService<RestDocument> = await getWebService(WebServiceTypes.URLCONVERTER);
		expect(urlConverterWebService, "The url converter webservice should have been initialized.").to.exist;
		expect(urlConverterWebService.getOperationParameters(), "The url converter operation should have been initialized.").to.exist;

		let ocrWebService: OcrWebService<RestDocument> = await getWebService(WebServiceTypes.OCR);
		expect(ocrWebService, "The ocr webservice should have been initialized.").to.exist;
		expect(ocrWebService.getOperationParameters(), "The ocr operation should have been initialized.").to.exist;
	});
});