import {Barcode, BaseToolbox, Billing, Converter, Ocr, Parameter, Pdfa, PdfPassword, Settings, Signature, UrlConverter} from "../generated-sources";

/**
 * <p>
 * An instance of this class wraps some sort of {@link WebServiceProtocol#REST} operation data and may be used as a
 * base to parameterize a webPDF webservice call, to any {@link WebServiceType}.
 * </p>
 * <p>
 * A {@link RestOperationData} object is an artificial supporting structure, that would not normally occur in the
 * openapi definition.
 * </p>
 */
export class RestOperationData implements Parameter {
	private billing?: Billing;
	private password?: PdfPassword;
	private settings?: Settings;
	private barcode?: Barcode;
	private converter?: Converter;
	private ocr?: Ocr;
	private pdfa?: Pdfa;
	private signature?: Signature;
	private toolbox?: Array<BaseToolbox>;
	private urlconverter?: UrlConverter;

	/**
	 * <p>
	 * Wraps the given parameter as operation data and may be used as a base to parameterize a
	 * {@link WebServiceType} webPDF webservice call.
	 * </p>
	 */
	public constructor(data?: any) {
		this.billing = Billing.fromJson(data.billing);
		this.password = PdfPassword.fromJson(data.password);
		this.settings = Settings.fromJson(data.settings);
		this.barcode = Barcode.fromJson(data.barcode);
		this.converter = Converter.fromJson(data.converter);
		this.ocr = Ocr.fromJson(data.ocr);
		this.pdfa = Pdfa.fromJson(data.pdfa);
		this.signature = Signature.fromJson(data.signature);
		this.toolbox = (data.toolbox || []).map(BaseToolbox.fromJson);
		this.urlconverter = UrlConverter.fromJson(data.urlconverter);
	}

	/**
	 * Returns the {@link Billing} settings set for this {@link RestOperationData}.
	 *
	 * @return The {@link Billing} settings set for this {@link RestOperationData}.
	 */
	public getBilling(): Billing | undefined {
		return this.billing;
	}

	/**
	 * Sets the {@link Billing} settings for this {@link RestOperationData}.
	 *
	 * @param value The {@link Billing} settings for this {@link RestOperationData}.
	 */
	public setBilling(value: Billing | undefined): void {
		this.billing = value;
	}

	/**
	 * Returns true should the set {@link Billing} not be undefined.
	 *
	 * @return true should the set {@link Billing} not be undefined.
	 */
	public isSetBilling(): boolean {
		return typeof this.billing !== "undefined";
	}

	/**
	 * Returns the {@link PdfPassword} settings set for this {@link RestOperationData}.
	 *
	 * @return The {@link PdfPassword} settings set for this {@link RestOperationData}.
	 */
	public getPassword(): PdfPassword | undefined {
		return this.password;
	}

	/**
	 * Sets the {@link PdfPassword} settings for this {@link RestOperationData}.
	 *
	 * @param value The {@link PdfPassword} settings for this {@link RestOperationData}.
	 */
	public setPassword(value: PdfPassword | undefined): void {
		this.password = value;
	}

	/**
	 * Returns true should the set {@link PdfPassword} not be undefined.
	 *
	 * @return true should the set {@link PdfPassword} not be undefined.
	 */
	public isSetPassword(): boolean {
		return typeof this.password !== "undefined";
	}

	/**
	 * Returns the {@link Settings} settings set for this {@link RestOperationData}.
	 *
	 * @return The {@link Settings} settings set for this {@link RestOperationData}.
	 */
	public getSettings(): Settings | undefined {
		return this.settings;
	}

	/**
	 * Sets the {@link Settings} settings for this {@link RestOperationData}.
	 *
	 * @param value The {@link Settings} settings for this {@link RestOperationData}.
	 */
	public setSettings(value: Settings | undefined): void {
		this.settings = value;
	}

	/**
	 * Returns true should the set {@link Settings} not be undefined.
	 *
	 * @return true should the set {@link Settings} not be undefined.
	 */
	public isSetSettings(): boolean {
		return typeof this.settings !== "undefined";
	}

	/**
	 * Returns the {@link Barcode} set for this {@link RestOperationData}.
	 *
	 * @return The {@link Barcode} set for this {@link RestOperationData}.
	 */
	public getBarcode(): Barcode | undefined {
		return this.barcode;
	}

	/**
	 * Sets the {@link Barcode} for this {@link RestOperationData}.
	 *
	 * @param value The {@link Barcode} for this {@link RestOperationData}.
	 */
	public setBarcode(value: Barcode | undefined): void {
		this.barcode = value;
	}

	/**
	 * Returns true should the set {@link Barcode} not be undefined.
	 *
	 * @return true should the set {@link Barcode} not be undefined.
	 */
	public isSetBarcode(): boolean {
		return typeof this.barcode !== "undefined";
	}

	/**
	 * Returns the {@link Converter} set for this {@link RestOperationData}.
	 *
	 * @return The {@link Converter} set for this {@link RestOperationData}.
	 */
	public getConverter(): Converter | undefined {
		return this.converter;
	}

	/**
	 * Sets the {@link Converter} for this {@link RestOperationData}.
	 *
	 * @param value The {@link Converter} for this {@link RestOperationData}.
	 */
	public setConverter(value: Converter | undefined): void {
		this.converter = value;
	}

	/**
	 * Returns true should the set {@link Converter} not be undefined.
	 *
	 * @return true should the set {@link Converter} not be undefined.
	 */
	public isSetConverter(): boolean {
		return typeof this.converter !== "undefined";
	}

	/**
	 * Returns the {@link Ocr} set for this {@link RestOperationData}.
	 *
	 * @return The {@link Ocr} set for this {@link RestOperationData}.
	 */
	public getOcr(): Ocr | undefined {
		return this.ocr;
	}

	/**
	 * Sets the {@link Ocr} for this {@link RestOperationData}.
	 *
	 * @param value The {@link Ocr} for this {@link RestOperationData}.
	 */
	public setOcr(value: Ocr | undefined): void {
		this.ocr = value;
	}

	/**
	 * Returns true should the set {@link Ocr} not be undefined.
	 *
	 * @return true should the set {@link Ocr} not be undefined.
	 */
	public isSetOcr(): boolean {
		return typeof this.ocr !== "undefined";
	}

	/**
	 * Returns the {@link Pdfa} set for this {@link RestOperationData}.
	 *
	 * @return The {@link Pdfa} set for this {@link RestOperationData}.
	 */
	public getPdfa(): Pdfa | undefined {
		return this.pdfa;
	}
	
	/**
	 * Sets the {@link Pdfa} for this {@link RestOperationData}.
	 *
	 * @param value The {@link Pdfa} for this {@link RestOperationData}.
	 */
	public setPdfa(value: Pdfa | undefined): void {
		this.pdfa = value;
	}
	
	/**
	 * Returns true should the set {@link Pdfa} not be undefined.
	 *
	 * @return true should the set {@link Pdfa} not be undefined.
	 */
	public isSetPdfa(): boolean {
		return typeof this.pdfa !== "undefined";
	}
	
	/**
	 * Returns the {@link Signature} set for this {@link RestOperationData}.
	 *
	 * @return The {@link Signature} set for this {@link RestOperationData}.
	 */
	public getSignature(): Signature | undefined {
		return this.signature;
	}
	
	/**
	 * Sets the {@link Signature} for this {@link RestOperationData}.
	 *
	 * @param value The {@link Signature} for this {@link RestOperationData}.
	 */
	public setSignature(value: Signature | undefined): void {
		this.signature = value;
	}
	
	/**
	 * Returns true should the set {@link Signature} not be undefined.
	 *
	 * @return true should the set {@link Signature} not be undefined.
	 */
	public isSetSignature(): boolean {
		return typeof this.signature !== "undefined";
	}
	
	/**
	 * <p>
	 * Returns the {@link BaseToolbox} list set for this {@link RestOperationData}.
	 * </p>
	 * <p>
	 * This may contain the following operations:
	 * <ul>
	 *  <li>{@link ToolboxAnnotationAnnotation}</li>
	 *  <li>{@link ToolboxAttachmentAttachment}</li>
	 *  <li>{@link ToolboxDeleteDelete}</li>
	 *  <li>{@link ToolboxDescriptionDescription}</li>
	 *  <li>{@link ToolboxExtractionExtraction}</li>
	 *  <li>{@link ToolboxFormsForms}</li>
	 *  <li>{@link ToolboxImageImage}</li>
	 *  <li>{@link ToolboxMergeMerge}</li>
	 *  <li>{@link ToolboxOptionsOptions}</li>
	 *  <li>{@link ToolboxPrintPrint}</li>
	 *  <li>{@link ToolboxRotateRotate}</li>
	 *  <li>{@link ToolboxSecuritySecurity}</li>
	 *  <li>{@link ToolboxSplitSplit}</li>
	 *  <li>{@link ToolboxWatermarkWatermark}</li>
	 *  <li>{@link ToolboxXmpXmp}</li>
	 *  <li>{@link ToolboxMoveMove}</li>
	 *  <li>{@link ToolboxOutlineOutline}</li>
	 *  <li>{@link ToolboxRedactRedact}</li>
	 *  <li>{@link ToolboxPortfolioPortfolio}</li>
	 *  <li>{@link ToolboxScaleScale}</li>
	 *  <li>{@link ToolboxCompressCompress}</li>
	 *  <li>{@link ToolboxTranscribeTranscribe}</li>
	 * </ul>
	 * </p>
	 *
	 * @return The {@link BaseToolbox} Array for this {@link RestOperationData}.
	 */
	public getToolbox(): Array<BaseToolbox> | undefined {
		if (typeof this.toolbox === "undefined") {
			return [];
		}
		
		return this.toolbox;
	}
	
	/**
	 * <p>
	 * Sets the {@link BaseToolbox} list for this {@link RestOperationData}.
	 * </p>
	 * <p>
	 * This may contain the following operations:
	 * <ul>
	 *  <li>{@link ToolboxAnnotationAnnotation}</li>
	 *  <li>{@link ToolboxAttachmentAttachment}</li>
	 *  <li>{@link ToolboxDeleteDelete}</li>
	 *  <li>{@link ToolboxDescriptionDescription}</li>
	 *  <li>{@link ToolboxExtractionExtraction}</li>
	 *  <li>{@link ToolboxFormsForms}</li>
	 *  <li>{@link ToolboxImageImage}</li>
	 *  <li>{@link ToolboxMergeMerge}</li>
	 *  <li>{@link ToolboxOptionsOptions}</li>
	 *  <li>{@link ToolboxPrintPrint}</li>
	 *  <li>{@link ToolboxRotateRotate}</li>
	 *  <li>{@link ToolboxSecuritySecurity}</li>
	 *  <li>{@link ToolboxSplitSplit}</li>
	 *  <li>{@link ToolboxWatermarkWatermark}</li>
	 *  <li>{@link ToolboxXmpXmp}</li>
	 *  <li>{@link ToolboxMoveMove}</li>
	 *  <li>{@link ToolboxOutlineOutline}</li>
	 *  <li>{@link ToolboxRedactRedact}</li>
	 *  <li>{@link ToolboxPortfolioPortfolio}</li>
	 *  <li>{@link ToolboxScaleScale}</li>
	 *  <li>{@link ToolboxCompressCompress}</li>
	 *  <li>{@link ToolboxTranscribeTranscribe}</li>
	 * </ul>
	 * </p>
	 *
	 * @param value The {@link BaseToolbox} Array for this {@link RestOperationData}.
	 */
	public setToolbox(value: Array<BaseToolbox> | undefined): void {
		this.toolbox = value;
	}
	
	/**
	 * Returns true should the set {@link BaseToolbox} Array not be undefined or empty.
	 *
	 * @return true should the set {@link BaseToolbox} not be undefined or empty.
	 */
	public isSetToolbox(): boolean {
		return typeof this.toolbox !== "undefined" && this.toolbox.length > 0;
	}
	
	/**
	 * Returns the {@link UrlConverter} set for this {@link RestOperationData}.
	 *
	 * @return The {@link UrlConverter} set for this {@link RestOperationData}.
	 */
	public getUrlconverter(): UrlConverter | undefined {
		return this.urlconverter;
	}
	
	/**
	 * Sets the {@link UrlConverter} for this {@link RestOperationData}.
	 *
	 * @param value The {@link UrlConverter} for this {@link RestOperationData}.
	 */
	public setUrlconverter(value: UrlConverter | undefined): void {
		this.urlconverter = value;
	}
	
	/**
	 * Returns true should the set {@link UrlConverter} not be undefined.
	 *
	 * @return true should the set {@link UrlConverter} not be undefined.
	 */
	public isSetUrlconverter(): boolean {
		return typeof this.urlconverter !== "undefined";
	}

	public static fromJson(data: any): RestOperationData {
		if (data === undefined || data === null) {
			return data;
		}

		return new RestOperationData(data);
	}

	public toJson(): any {
		return {
			'billing': this.billing?.toJson(),
			'password': this.password?.toJson(),
			'settings': this.settings?.toJson(),
			'barcode': this.barcode?.toJson(),
			'converter': this.converter?.toJson(),
			'ocr': this.ocr?.toJson(),
			'pdfa': this.pdfa?.toJson(),
			'signature': this.signature?.toJson(),
			'toolbox': this.toolbox?.map((data) => data.toJson()),
			'urlconverter': this.urlconverter?.toJson()
		};
	}

	public clone(): RestOperationData {
		return RestOperationData.fromJson(this.toJson());
	}
}

