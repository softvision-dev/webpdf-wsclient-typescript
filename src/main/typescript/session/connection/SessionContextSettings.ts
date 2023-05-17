import {WebServiceProtocol} from "../../webservice";
import {SessionContext} from "./SessionContext";
import {AxiosProxyConfig} from "axios";
import {Agent} from "https";

/**
 * <p>
 * An instance of {@link SessionContextSettings} collects and provides advanced settings for a webPDF {@link Session}.
 * During it´s existence a {@link Session} will obey those settings, when making requests to a webPDF server.<br>
 * <b>Be aware:</b> {@link SessionContextSettings} can not be changed post initialization. If you want to make such
 * changes, you have to create a new {@link Session} using the {@link SessionContext} of your choice.
 * </p>
 * <p>
 * <b>Be aware:</b> A {@link SessionContextSettings} is not required to serve multiple {@link Session}s at a time.
 * It is expected to create a new {@link SessionContextSettings} for each existing {@link Session}.
 * </p>
 */
export class SessionContextSettings {
    private readonly webServiceProtocol: WebServiceProtocol;
    private readonly url: URL;
    private readonly tlsContext?: Agent;
    private readonly proxy?: AxiosProxyConfig;
    private readonly skewTime: number;

    /**
     * Creates a new {@link SessionContextSettings} from the provided {@link SessionContext}.
     * During it´s existence a {@link Session} will obey those settings, when making requests to a webPDF server.<br>
     * <b>Be aware:</b> A {@link SessionContextSettings} can not be changed post initialization. You must use a
     * {@link SessionContext} instance prior to the {@link Session} initialization, to manipulate those
     * settings.
     *
     * @param contextConfiguration The {@link SessionContext} initializing this {@link SessionContextSettings}.
     */
    public constructor(contextConfiguration: SessionContext) {
        this.webServiceProtocol = contextConfiguration.getWebServiceProtocol();
        this.url = contextConfiguration.getUrl();
        this.tlsContext = contextConfiguration.getTlsContext();
        this.proxy = contextConfiguration.getProxy();
        this.skewTime = contextConfiguration.getSkewTime();
    }

    /**
     * Returns the {@link WebServiceProtocol}, that shall be used to communicate with the server.
     *
     * @return The {@link WebServiceProtocol}, that shall be used to communicate with the server.
     */
    public getWebServiceProtocol(): WebServiceProtocol {
        return this.webServiceProtocol;
    }

    /**
     * Returns the {@link URL} of the server.
     *
     * @return The {@link URL} of the server.
     */
    public getUrl(): URL {
        return this.url;
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
        return this.tlsContext;
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
        return this.proxy;
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
        return this.skewTime;
    }
}
