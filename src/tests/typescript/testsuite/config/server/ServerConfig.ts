import {ConfigNodeContainer} from "../json";

export class ServerConfig extends ConfigNodeContainer {
	public static readonly SERVER_CONFIG_NODE: string = "/server";

	public constructor(node: any) {
		super(node);
	}

	public getLocalURL(): string {
		return this.getString("/local/url", "");
	}

	public getLocalAdminName(): string {
		return this.getString("/local/adminName", "");
	}

	public getLocalAdminPassword(): string {
		return this.getString("/local/adminPassword", "");
	}

	public getLocalUserName(): string {
		return this.getString("/local/userName", "");
	}

	public getLocalUserPassword(): string {
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