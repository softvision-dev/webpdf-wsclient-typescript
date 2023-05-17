import {TestConfig} from "../config";
import {ServerType} from "./ServerType";
import {TransferProtocol} from "./TransferProtocol";

const https = require('https');

export class TestServer {
	private localServer: URL;
	private publicServer: URL;

	public constructor() {
		this.localServer = new URL(TestConfig.instance.getServerConfig().getLocalURL());
		this.localServer.pathname = TestConfig.instance.getServerConfig().getLocalPath();

		this.publicServer = new URL(TestConfig.instance.getServerConfig().getPublicURL());
		this.publicServer.pathname = TestConfig.instance.getServerConfig().getPublicPath();
	}

	public getServer(serverType: ServerType, serverProtocol?: TransferProtocol): URL {
		return this.buildServer(
			serverType,
			(typeof serverProtocol !== "undefined") ? serverProtocol : TransferProtocol.HTTP
		);
	}

	private buildServer(serverType: ServerType, serverProtocol: TransferProtocol): URL {
		let url: URL;

		switch (serverType) {
			case ServerType.LOCAL:
				url = this.localServer;

				if (serverProtocol === TransferProtocol.HTTP) {
					url.port = TestConfig.instance.getServerConfig().getLocalHttpPort().toString();
					url.protocol = "http";
				} else {
					url.port = TestConfig.instance.getServerConfig().getLocalHttpsPort().toString();
					url.protocol = "https";
				}
				break;
			case ServerType.PUBLIC:
				url = this.publicServer;

				if (serverProtocol === TransferProtocol.HTTP) {
					url.port = TestConfig.instance.getServerConfig().getPublicHttpPort().toString();
					url.protocol = "http";
				} else {
					url.port = TestConfig.instance.getServerConfig().getPublicHttpsPort().toString();
					url.protocol = "https";
				}
				break;
			default:
				throw new Error("URL not available");
		}

		return url;
	}

	public getLocalUser(): string {
		return TestConfig.instance.getServerConfig().getLocalUser();
	}

	public getLocalPassword(): string {
		return TestConfig.instance.getServerConfig().getLocalPassword();
	}

	public async getDemoCertificate(): Promise<any> {
		let serverUrl: URL = this.getServer(ServerType.PUBLIC, TransferProtocol.HTTPS);

		return await new Promise<any>(function (resolve) {
			var req = https.request(serverUrl.href, function (res: any) {
				resolve(res.socket.getPeerCertificate(true));
			});
			req.end();
		});
	}
}