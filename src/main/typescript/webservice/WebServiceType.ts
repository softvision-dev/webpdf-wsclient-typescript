import {Barcode, BaseToolbox, Converter, Ocr, Pdfa, Signature, UrlConverter} from "../generated-sources";
import { WebService } from "./WebService";

/**
 * Represents a single Webservice type with its unique endpoint
 */
export class WebServiceType {
	public static readonly ID_PLACEHOLDER: string = "{documentId}";
	private readonly restEndpoint: string;

	/**
	 * Instantiates an WebServiceType object.
	 */
	public constructor(restEndpoint: string) {
		this.restEndpoint = restEndpoint;
	}

	/**
	 * Returns the endpoint of the REST webservice.
	 */
	public getRestEndpoint(): string {
		return this.restEndpoint;
	}

	/**
	 * Returns true, if this {@link WebServiceType} is representing the same type, as the given
	 * {@link WebServiceType}. (false otherwise.)
	 *
	 * @param target The {@link WebServiceType} to compare this {@link WebServiceType with.}
	 * @return true, if this {@link WebServiceType} is representing the same type, as the given
	 * {@link WebServiceType}. (false otherwise.)
	 */
	public equals(target: WebServiceType): boolean {
		return this.getRestEndpoint() ===  target.getRestEndpoint();
	}
}

/**
 * Bundles the available {@link WebService} endpoints of the webPDF server, that are known to this version of the
 * wsclient.
 *
 * @see #CONVERTER
 * @see #TOOLBOX
 * @see #PDFA
 * @see #OCR
 * @see #SIGNATURE
 * @see #URLCONVERTER
 * @see #BARCODE
 */
export const WebServiceTypes = {
	/**
	 * The {@link Converter} webservice provides the means to convert different file formats to PDF.
	 */
	"CONVERTER": new WebServiceType("converter/" + WebServiceType.ID_PLACEHOLDER),

	/**
	 * The {@link BaseToolbox} webservice provides the means to manipulate and analyze documents.
	 */
	"TOOLBOX": new WebServiceType("toolbox/" + WebServiceType.ID_PLACEHOLDER),

	/**
	 * The {@link Pdfa} webservice provides the means to convert a PDF document to PDF/A.
	 */
	"PDFA": new WebServiceType("pdfa/" + WebServiceType.ID_PLACEHOLDER),

	/**
	 * The {@link Ocr} webservice allows to recognize text and add a text layer to documents.
	 */
	"OCR": new WebServiceType("ocr/" + WebServiceType.ID_PLACEHOLDER),

	/**
	 * The {@link Signature} webservice allows adding digital signatures to documents.
	 */
	"SIGNATURE": new WebServiceType("signature/" + WebServiceType.ID_PLACEHOLDER),

	/**
	 * The {@link UrlConverter} webservice allows converting a URL resource to PDF.
	 */
	"URLCONVERTER": new WebServiceType("urlconverter"),

	/**
	 * The {@link Barcode} webservice allows creating barcodes for and reading barcodes from documents.
	 */
	"BARCODE": new WebServiceType("barcode/" + WebServiceType.ID_PLACEHOLDER)
};