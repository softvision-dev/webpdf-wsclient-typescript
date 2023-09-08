const globals = global as any;

type Btoa = WindowOrWorkerGlobalScope["btoa"];

/**
 * library configuration for wsclient
 */
class WsclientConfiguration {
	private static _instance: WsclientConfiguration;
	private _FormData: new (options?: any) => FormData;
	private _btoa: Btoa;

	private constructor() {
		// init defaults
		if (typeof process !== "undefined") {
			this._FormData = require("form-data");
			this._btoa = function (data: string): string {
				return Buffer.from(data).toString('base64');
			};
		} else {
			this._FormData = typeof FormData !== "undefined" ? FormData : globals.FormData;
			this._btoa = typeof window !== "undefined" ? window.btoa.bind(window) : globals.btoa;
		}
	}

	/**
	 * returns the singleton configuration instance
	 * @return {WsclientConfiguration}
	 */
	public static get instance(): WsclientConfiguration {
		if (typeof this._instance === "undefined") {
			this._instance = new WsclientConfiguration();
		}

		return this._instance;
	}

	/**
	 * returns the configured FormData constructor or a globally defined variant of it
	 * @return {{new(options?: any): FormData}}
	 * @constructor
	 */
	public get FormData(): new (options?: any) => FormData {
		return this._FormData;
	}

	/**
	 * sets the FormData constructor to use in wsclient
	 * @param {{new(options?: any): FormData}} value
	 * @constructor
	 */
	public set FormData(value: new (options?: any) => FormData) {
		this._FormData = value;
	}

	/**
	 * returns the configured btoa function or a globally defined variant of it
	 * @return {Btoa}
	 */
	public get btoa(): Btoa {
		return this._btoa;
	}

	/**
	 * sets the btoa function to use in wsclient
	 * @param {Btoa} value
	 */
	public set btoa(value: Btoa) {
		this._btoa = value;
	}
}

/**
 * the singleton configuration instance
 */
export const wsclientConfiguration: WsclientConfiguration = WsclientConfiguration.instance;