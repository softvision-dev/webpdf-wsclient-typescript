import {WebService} from "./WebService";
import {Document, instanceOfRestSession, RestDocument, RestSession, Session} from "../session";
import {WebServiceType, WebServiceTypes} from "./WebServiceType";
import {WebServiceProtocol} from "./WebServiceProtocol";
import {ClientResultException, WsclientErrors} from "../exception";
import {
	Barcode,
	BarcodeOperation,
	BarcodeOperationInterface,
	Converter,
	ConverterOperation,
	ConverterOperationInterface,
	Ocr,
	OcrOperation,
	OcrOperationInterface,
	Parameter,
	Pdfa,
	PdfaOperation,
	PdfaOperationInterface,
	Signature,
	SignatureOperation,
	SignatureOperationInterface,
	ToolboxOperation,
	ToolboxOperationInterface,
	UrlConverter,
	UrlConverterOperation,
	UrlConverterOperationInterface
} from "../generated-sources";
import {RestOperationData} from "../openapi";
import {BarcodeWebService, ConverterWebService, OcrWebService, PdfaWebService, RestWebService, SignatureWebService, ToolboxWebService, UrlConverterWebService} from "./rest";

/**
 * An instance of {@link WebServiceFactory} produces {@link WebService} instances that establish connections to
 * specific webPDF webservice endpoints ({@link WebServiceType}), using a specific {@link WebServiceProtocol} and
 * expecting a specific {@link Document} type as the result.
 */
export class WebServiceFactory {
	/**
	 * This class is not intended to be instantiated, use the static methods instead.
	 */
	private constructor() {
	}

	/**
	 * Creates a matching {@link WebService} instance to execute a webPDF operation.
	 *
	 * @template T_DOCUMENT
	 * @template T_WEBSERVICE
	 * @param {T_DOCUMENT}   The {@link Document} type, processed and created by the {@link WebService}.
	 * @param {T_WEBSERVICE} The {@link WebService} to create an interface for.
	 * @param session        The {@link Session} context for the created {@link WebService}.
	 * @param webServiceType The {@link WebServiceType} to create an interface for.
	 * @return A matching {@link WebService} instance.
	 * @throws ResultException Shall be thrown, if the {@link WebService} creation failed.
	 */
	public static createInstance<T_DOCUMENT extends Document,
		T_WEBSERVICE extends WebService<any, any, T_DOCUMENT, any, any, any>>
	(session: Session, webServiceType: WebServiceType): T_WEBSERVICE {
		switch (session.getWebServiceProtocol()) {
			case WebServiceProtocol.REST:
				if (!instanceOfRestSession(session)) {
					throw new ClientResultException(WsclientErrors.INVALID_WEBSERVICE_SESSION);
				}

				return WebServiceFactory.createRestInstance(
					session as RestSession<RestDocument>, webServiceType,
					WebServiceFactory.createRestParameters(webServiceType)
				) as WebService<any, any, T_DOCUMENT, any, any, any> as T_WEBSERVICE;
			default:
				throw new ClientResultException(WsclientErrors.UNKNOWN_WEBSERVICE_PROTOCOL);
		}
	}

	/**
	 * <p>
	 * Creates a matching {@link WebService} instance to execute a webPDF operation.
	 * </p>
	 * <p>
	 * Detects the {@link WebServiceType} by loading the operation data from the
	 * given {@link Parameter}.<br>
	 * The {@link Parameter} shall contain a {@link DataFormat#JSON} data transfer object defined in the given
	 * {@link Session} object translatable to the required operation data.
	 * </p>
	 *
	 * @template T_DOCUMENT
	 * @template T_WEBSERVICE
	 * @param T_DOCUMENT   The {@link Document} type, processed and created by the {@link WebService}.
	 * @param T_WEBSERVICE The {@link WebServiceType} to create an interface for.
	 * @param session        The {@link Session} context for the created {@link WebService}.
	 * @param parameter      The {@link Parameter} to read the operation data from and to detect the
	 *                       {@link WebServiceType} by.
	 * @return A matching {@link WebService} instance.
	 * @throws ResultException Shall be thrown, if the {@link WebService} creation failed.
	 */
	public static createByParameters<T_DOCUMENT extends Document,
		T_WEBSERVICE extends WebService<any, any, T_DOCUMENT, any, any, any>>
	(session: Session, parameter: any): T_WEBSERVICE {
		switch (session.getWebServiceProtocol()) {
			case WebServiceProtocol.REST:
				if (!instanceOfRestSession(session)) {
					throw new ClientResultException(WsclientErrors.INVALID_WEBSERVICE_SESSION);
				}

				// convert the data into a operation object
				let restOperationData: RestOperationData = RestOperationData.fromJson(parameter);

				return WebServiceFactory.createRestInstance(
					session as RestSession<RestDocument>, this.determineWebServiceType(restOperationData),
					restOperationData
				) as WebService<any, any, T_DOCUMENT, any, any, any> as T_WEBSERVICE;
			default:
				throw new ClientResultException(WsclientErrors.UNKNOWN_WEBSERVICE_PROTOCOL);
		}
	}

	/**
	 * Creates the {@link RestOperationData} container for a {@link RestWebService} of the given {@link WebServiceType}.
	 *
	 * @param webServiceType The {@link WebServiceType} a operation data container shall be created for.
	 * @return The resulting {@link RestOperationData} container.
	 * @throws ResultException Shall be thrown, should the {@link WebServiceType} be unknown.
	 */
	private static createRestParameters(webServiceType: WebServiceType): RestOperationData {
		switch (webServiceType) {
			case WebServiceTypes.CONVERTER:
				return RestOperationData.fromJson(ConverterOperation.fromJson({
					converter: Converter.fromJson({}).toJson()
				} as ConverterOperationInterface));
			case WebServiceTypes.URLCONVERTER:
				return RestOperationData.fromJson(UrlConverterOperation.fromJson({
					urlconverter: UrlConverter.fromJson({}).toJson()
				} as UrlConverterOperationInterface));
			case WebServiceTypes.PDFA:
				return RestOperationData.fromJson(PdfaOperation.fromJson({
					pdfa: Pdfa.fromJson({}).toJson()
				} as PdfaOperationInterface));
			case WebServiceTypes.TOOLBOX:
				return RestOperationData.fromJson(ToolboxOperation.fromJson({
					toolbox: []
				} as ToolboxOperationInterface));
			case WebServiceTypes.OCR:
				return RestOperationData.fromJson(OcrOperation.fromJson({
					ocr: Ocr.fromJson({}).toJson()
				} as OcrOperationInterface));
			case WebServiceTypes.SIGNATURE:
				return RestOperationData.fromJson(SignatureOperation.fromJson({
					signature: Signature.fromJson({}).toJson()
				} as SignatureOperationInterface));
			case WebServiceTypes.BARCODE:
				return RestOperationData.fromJson(BarcodeOperation.fromJson({
					barcode: Barcode.fromJson({}).toJson()
				} as BarcodeOperationInterface));
			default:
				throw new ClientResultException(WsclientErrors.UNKNOWN_WEBSERVICE_TYPE);
		}
	}

	/**
	 * <p>
	 * Creates a matching {@link WebService} instance to execute a webPDF operation.
	 * </p>
	 *
	 * @template T_DOCUMENT
	 * @template T_WEBSERVICE
	 * @param {T_DOCUMENT}   The {@link Document} type, processed and created by the {@link WebService}.
	 * @param {T_WEBSERVICE} The {@link WebServiceType} to create an interface for.
	 * @param session        The {@link Session} context for the created {@link WebService}.
	 * @param webServiceType The {@link WebServiceType} to create.
	 * @param operationData  The {@link RestOperationData} to use.
	 * @return A matching {@link WebService} instance.
	 * @throws ResultException Shall be thrown, if the {@link WebService} creation failed.
	 */
	private static createRestInstance<T_DOCUMENT extends RestDocument, T_WEBSERVICE extends RestWebService<any, any, T_DOCUMENT>>
	(session: RestSession<T_DOCUMENT>, webServiceType: WebServiceType, operationData: RestOperationData): T_WEBSERVICE {
		switch (webServiceType) {
			case WebServiceTypes.CONVERTER:
				let converterWebService: ConverterWebService<T_DOCUMENT> = new ConverterWebService(session);
				converterWebService.setOperationParameters(operationData.getConverter());
				return converterWebService as RestWebService<any, any, T_DOCUMENT> as T_WEBSERVICE;
			case WebServiceTypes.SIGNATURE:
				let signatureWebService: SignatureWebService<T_DOCUMENT> = new SignatureWebService(session);
				signatureWebService.setOperationParameters(operationData.getSignature());
				return signatureWebService as RestWebService<any, any, T_DOCUMENT> as T_WEBSERVICE;
			case WebServiceTypes.PDFA:
				let pdfaWebService: PdfaWebService<T_DOCUMENT> = new PdfaWebService(session);
				pdfaWebService.setOperationParameters(operationData.getPdfa());
				return pdfaWebService as RestWebService<any, any, T_DOCUMENT> as T_WEBSERVICE;
			case WebServiceTypes.OCR:
				let ocrWebService: OcrWebService<T_DOCUMENT> = new OcrWebService(session);
				ocrWebService.setOperationParameters(operationData.getOcr());
				return ocrWebService as RestWebService<any, any, T_DOCUMENT> as T_WEBSERVICE;
			case WebServiceTypes.TOOLBOX:
				let toolboxWebService: ToolboxWebService<T_DOCUMENT> = new ToolboxWebService(session);
				toolboxWebService.setOperationParameters(operationData.getToolbox());
				return toolboxWebService as RestWebService<any, any, T_DOCUMENT> as T_WEBSERVICE;
			case WebServiceTypes.URLCONVERTER:
				let urlConverterWebService: UrlConverterWebService<T_DOCUMENT> = new UrlConverterWebService(session);
				urlConverterWebService.setOperationParameters(operationData.getUrlconverter());
				return urlConverterWebService as RestWebService<any, any, T_DOCUMENT> as T_WEBSERVICE;
			case WebServiceTypes.BARCODE:
				let barcodeConverterWebService: BarcodeWebService<T_DOCUMENT> = new BarcodeWebService(session);
				barcodeConverterWebService.setOperationParameters(operationData.getBarcode());
				return barcodeConverterWebService as RestWebService<any, any, T_DOCUMENT> as T_WEBSERVICE;
			default:
				throw new ClientResultException(WsclientErrors.UNKNOWN_WEBSERVICE_TYPE);
		}
	}


	/**
	 * Generalizes the Translation of an operation data container to a {@link WebServiceType} selection for the REST
	 * operation data container {@link RestOperationData}.
	 *
	 * @param operationData The operation data object to determine the {@link WebServiceType} for.
	 * @return The resulting {@link WebServiceType}.
	 * @throws ResultException Shall be thrown, should the determination of a matching {@link WebServiceType} fail.
	 */
	private static determineWebServiceType(operationData: RestOperationData): WebServiceType {
		if (operationData.isSetConverter()) {
			return WebServiceTypes.CONVERTER;
		} else if (operationData.isSetBarcode()) {
			return WebServiceTypes.BARCODE;
		} else if (operationData.isSetOcr()) {
			return WebServiceTypes.OCR;
		} else if (operationData.isSetPdfa()) {
			return WebServiceTypes.PDFA;
		} else if (operationData.isSetSignature()) {
			return WebServiceTypes.SIGNATURE;
		} else if (operationData.isSetToolbox()) {
			return WebServiceTypes.TOOLBOX;
		} else if (operationData.isSetUrlconverter()) {
			return WebServiceTypes.URLCONVERTER;
		} else {
			throw new ClientResultException(WsclientErrors.UNKNOWN_WEBSERVICE_TYPE);
		}
	}
}