import {ConfigNodeContainer} from "../json";

export class ServerConfig extends ConfigNodeContainer {
	public static readonly SERVER_CONFIG_NODE: string = "/server";
	private useLdap: boolean;

	public constructor(node: any, useLdap: boolean) {
		super(node);

		this.useLdap = useLdap;
	}

	public getLocalURL(): string {
		return this.getString("/local/url", "");
	}

	public getLocalAdminName(): string {
		if (this.useLdap) {
			return this.getString("/local/ldapAdminName", "");
		}

		return this.getString("/local/adminName", "");
	}

	public getLocalAdminPassword(): string {
		if (this.useLdap) {
			return this.getString("/local/ldapAdminPassword", "");
		}

		return this.getString("/local/adminPassword", "");
	}

	public getLocalUserName(): string {
		if (this.useLdap) {
			return this.getString("/local/ldapUserName", "");
		}

		return this.getString("/local/userName", "");
	}

	public getLocalUserPassword(): string {
		if (this.useLdap) {
			return this.getString("/local/ldapUserPassword", "");
		}

		return this.getString("/local/userPassword", "");
	}

	public getLocalHttpPort(): number {
		return this.getInteger("/local/httpPort", -1);
	}

	public getLocalHttpsPort(): number {
		return this.getInteger("/local/httpsPort", -1);
	}

	public getLocalPath(): string {
		return this.getString("/local/path", "");
	}

	public getPublicURL(): string {
		return this.getString("/public/url", "");
	}

	public getPublicHttpPort(): number {
		return this.getInteger("/public/httpPort", -1);
	}

	public getPublicHttpsPort(): number {
		return this.getInteger("/public/httpsPort", -1);
	}

	public getPublicPath(): string {
		return this.getString("/public/path", "");
	}
}