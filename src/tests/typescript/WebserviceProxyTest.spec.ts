import {ServerType, TestConfig, TestServer, TransferProtocol} from "./testsuite";
import {expect} from "chai";
import {
    RestDocument,
    RestSession,
    SessionContext,
    SessionFactory,
    UrlConverterWebService,
    UserAuthProvider,
    WebServiceProtocol,
    WebServiceTypes
} from "../../main/typescript";
import {AxiosProxyConfig} from "axios";
import {UrlConverter, UrlConverterInterface} from "../../main/typescript/generated-sources";
import {HttpsProxyAgent} from "https-proxy-agent";

require("./bootstrap");

const fs = require('fs');
const tmp = require('tmp');

describe("WebserviceProxyTest", function () {
    let testServer: TestServer = new TestServer();
    tmp.setGracefulCleanup();

    it('testRESTProxyHTTP', async function () {
        if (!TestConfig.instance.getIntegrationTestConfig().isProxyTestsActive()) {
            this.skip();
            return;
        }

        let sessionContext: SessionContext = new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL));
        sessionContext.setProxy({
            host: "127.0.0.1",
            port: 8888
        } as AxiosProxyConfig);

        let session: RestSession<RestDocument> = await SessionFactory.createInstance(
            sessionContext, new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
        );

        let webService: UrlConverterWebService<RestDocument> = session.createWebServiceInstance(WebServiceTypes.URLCONVERTER);
        expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

        webService.setOperationParameters(
            UrlConverter.fromJson({
                url: "https://docs.webpdf.de",
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

    it('testRESTProxyHTTPS', async function () {
        if (!TestConfig.instance.getIntegrationTestConfig().isProxyTestsActive()) {
            this.skip();
            return;
        }

        let sessionContext: SessionContext = new SessionContext(
            WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL, TransferProtocol.HTTPS)
        );

        let agent: HttpsProxyAgent<string> = new HttpsProxyAgent('http://127.0.0.1:8888');
        agent.options.rejectUnauthorized = false;
        sessionContext.setTlsContext(agent);

        let session: RestSession<RestDocument> = await SessionFactory.createInstance(
            sessionContext, new UserAuthProvider(testServer.getLocalUserName(), testServer.getLocalUserPassword())
        );

        let webService: UrlConverterWebService<RestDocument> = session.createWebServiceInstance(WebServiceTypes.URLCONVERTER);
        expect(webService.getOperationParameters(), "Operation should have been initialized").to.exist;

        webService.setOperationParameters(
            UrlConverter.fromJson({
                url: "https://docs.webpdf.de",
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
});
