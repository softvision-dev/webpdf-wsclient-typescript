import {WebServiceProtocol} from "../../webservice";
import {AxiosProxyConfig} from "axios";
import {Agent} from "https";

/**
 * <p>
 * An instance of {@link SessionContext} collects and provides advanced settings for the initialization of
 * a webPDF {@link Session}. During it´s existence a {@link Session} will obey those settings, when making requests
 * to a webPDF server.
 * </p>
 * <p>
 * <b>Be aware:</b> A {@link Session} will deduce it´s {@link SessionContextSettings} from a {@link SessionContext}.
 * The {@link SessionContextSettings} of a running {@link Session} can not be changed.
 * </p>
 * <p>
 * <b>Be aware:</b> A {@link SessionContext} is not required to serve multiple {@link Session}s at a time. It is
 * expected to create a new {@link SessionContext} for each existing {@link Session}.
 * </p>
 */
export class SessionContext {
    private readonly _webServiceProtocol: WebServiceProtocol;
    private readonly _url: URL;
    private _tlsContext?: Agent;
    private _proxy?: AxiosProxyConfig;
    private _skewTime: number;

    /**
     * <p>
     * Instantiates a new {@link SessionContext} for {@link Session}s.<br>
     * The constructor initializes the non-optional settings, that must be provided. All further settings are optional,
     * and you may or may not require to set them.
     * </p>
     * <p>
     * <b>Be aware:</b> A {@link Session} will deduce it´s {@link SessionContextSettings} from a {@link SessionContext}.
     * The {@link SessionContextSettings} of a running {@link Session} can not be changed.
     * </p>
     * <p>
     * <b>Be aware:</b> A {@link SessionContext} is not required to serve multiple {@link Session}s at a time. It is
     * expected to create a new {@link SessionContext} for each existing {@link Session}.
     * </p>
     *
     * @param webServiceProtocol The {@link WebServiceProtocol} used to communicate with the server.
     * @param url                The {@link URL} of the server.
     */
    public constructor(webServiceProtocol: WebServiceProtocol, url: URL) {
        this._webServiceProtocol = webServiceProtocol;
        this._url = url;
        this._skewTime = 0;
    }

    /**
     * Returns the {@link WebServiceProtocol}, that shall be used to communicate with the server.
     *
     * @return The {@link WebServiceProtocol}, that shall be used to communicate with the server.
     */
    public getWebServiceProtocol(): WebServiceProtocol {
        return this._webServiceProtocol;
    }

    /**
     * Returns the {@link URL} of the server.
     *
     * @return The {@link URL} of the server.
     */
    public getUrl(): URL {
        return this._url;
    }

    /**
     * <p>
     * Sets the {@link Agent} for {@link Session}s.<br>
     * A {@link Agent} allows to send requests to the server via secured HTTPS connections.
     * </p>
     *
     * @param tlsContext The {@link Agent}, that shall be used.
     */
    public setTlsContext(tlsContext: Agent | undefined): void {
        this._tlsContext = tlsContext;
    }

    /**
     * <p>
     * Returns the {@link Agent} for {@link Session}s.<br>
     * A {@link Agent} allows to send requests to the server via secured HTTPS connections.
     * </p>
     *
     * @return The {@link Agent}, that shall be used.
     */
    public getTlsContext(): Agent | undefined {
        return this._tlsContext;
    }

    /**
     * <p>
     * Sets the {@link AxiosProxyConfig} for {@link Session}s.<br>
     * A {@link AxiosProxyConfig} allows to route requests to the server via the defined proxy.
     * </p>
     *
     * @param proxy The {@link AxiosProxyConfig}, that shall be used.
     */
    public setProxy(proxy: AxiosProxyConfig | undefined): void {
        this._proxy = proxy;
    }

    /**
     * <p>
     * Returns the {@link AxiosProxyConfig} for {@link Session}s.<br>
     * A {@link AxiosProxyConfig} allows to route requests to the server via the defined proxy.
     * </p>
     *
     * @return The {@link AxiosProxyConfig}, that shall be used.
     */
    public getProxy(): AxiosProxyConfig | undefined {
        return this._proxy;
    }

    /**
     * <p>
     * Sets a skew time for the token refresh of {@link Session}s.<br>
     * The skew time helps to avoid using expired authorization tokens. The returned value (in seconds) is subtracted
     * from the expiry time to avoid issues possibly caused by transfer delays.<br>
     * It can not be guaranteed, but is recommended, that custom implementations of {@link AuthProvider} handle this
     * accordingly.
     * </p>
     *
     * @param skewTime The skew time in seconds, that shall be used.
     */
    public setSkewTime(skewTime: number): void {
        this._skewTime = skewTime;
    }

    /**
     * <p>
     * Returns a skew time for the token refresh of {@link Session}s.<br>
     * The skew time helps to avoid using expired authorization tokens. The returned value (in seconds) is subtracted
     * from the expiry time to avoid issues possibly caused by transfer delays.<br>
     * It can not be guaranteed, but is recommended, that custom implementations of {@link AuthProvider} handle this
     * accordingly.
     * </p>
     *
     * @return The skew time in seconds, that shall be used.
     */
    public getSkewTime(): number {
        return this._skewTime;
    }

}
