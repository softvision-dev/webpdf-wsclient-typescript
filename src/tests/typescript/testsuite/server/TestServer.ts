import {TestConfig} from "../config";
import {ServerType} from "./ServerType";
import {TransferProtocol} from "./TransferProtocol";
import {DetailedPeerCertificate, TLSSocket} from "tls";
import {DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait} from "testcontainers";
import path from "path";

const https = require('https');

export class TestServer {
	private localServer: URL;
	private publicServer: URL;
	private environment?: StartedDockerComposeEnvironment;
	private readonly composeFilePath: string = "../../../../../docker";
	private readonly composeFile: string = "docker-compose.yml";

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

	public getLocalAdminName(): string {
		return TestConfig.instance.getServerConfig().getLocalAdminName();
	}

	public getLocalAdminPassword(): string {
		return TestConfig.instance.getServerConfig().getLocalAdminPassword();
	}

	public getLocalUserName(): string {
		return TestConfig.instance.getServerConfig().getLocalUserName();
	}

	public getLocalUserPassword(): string {
		return TestConfig.instance.getServerConfig().getLocalUserPassword();
	}

	public async getDemoCertificate(): Promise<DetailedPeerCertificate> {
		let serverUrl: URL = this.getServer(ServerType.PUBLIC, TransferProtocol.HTTPS);

		return await new Promise<any>(function (resolve) {
			var req = https.request(serverUrl.href, function (res: any) {
				let socket: TLSSocket = res.socket;
				resolve(socket.getPeerCertificate(true));
			});
			req.end();
		});
	}

	public async start(): Promise<void> {
		if (this.isRunning()) {
			return;
		}

		try {
			this.environment = await new DockerComposeEnvironment(path.join(__dirname, this.composeFilePath), this.composeFile)
				.withWaitStrategy("testapp-webpdf-wsclient-ldap", Wait.forListeningPorts())
				.withWaitStrategy("testapp-webpdf-wsclient-proxy", Wait.forListeningPorts())
				.withWaitStrategy("testapp-webpdf-wsclient-server", Wait.forListeningPorts())
				.up();
		} catch (e) {
			console.debug("docker exception", e);
		}
	}

	public async stop(): Promise<void> {
		if (!this.isRunning()) {
			return;
		}

		await this.environment!.down();
		this.environment = undefined;
	}

	public isRunning(): boolean {
		return typeof this.environment !== "undefined";
	}
}