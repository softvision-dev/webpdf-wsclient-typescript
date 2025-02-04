import {AxiosError, AxiosHeaders, AxiosProgressEvent, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse, RawAxiosRequestHeaders} from "axios";
import {RestSession} from "../../rest";
import {DataFormats} from "../../DataFormat";
import {HttpMethod} from "./HttpMethod";
import {AuthMaterial} from "../../auth";
import {ClientResultException, ResultException, ServerResultException, WsclientErrors} from "../../../exception";
import HttpStatusCode from "./httpStatusCode";
import {HttpHeaders} from "./HttpHeader";

/**
 * An instance of {@link HttpRestRequest} monitors and executes a webPDF wsclient request executed within a
 * {@link RestSession} and handles the server´s response.
 */
export class HttpRestRequest {
	private readonly session: RestSession<any>;
	private acceptHeader: string;
	private requestConfig: AxiosRequestConfig;

	/**
	 * Creates a {@link HttpRestRequest} preparing and executing a request for a given {@link RestSession} to provide
	 * a matching response object.
	 *
	 * @param session the {@link RestSession} this {@link HttpRestRequest} is handling the request and response for.
	 */
	private constructor(session: RestSession<any>) {
		this.session = session;
		this.acceptHeader = DataFormats.JSON.getMimeType();
		this.requestConfig = {
			beforeRedirect: (options: Record<string, any>) => {
				let requestHeaders: RawAxiosRequestHeaders | AxiosHeaders = this.requestConfig?.headers || {};

				if (typeof options.headers[HttpHeaders.AUTHORIZATION] === "undefined") {
					options.headers[HttpHeaders.AUTHORIZATION] = requestHeaders[HttpHeaders.AUTHORIZATION];
				}
			}
		};
	}

	/**
	 * Creates a {@link HttpRestRequest} preparing and executing a request for a given {@link RestSession} to provide
	 * a matching response object.
	 *
	 * @param session the {@link RestSession} this Rest request is handling.
	 * @return A {@link HttpRestRequest} preparing and executing a request for a given {@link RestSession} to provide
	 * a matching response object.
	 */
	public static createRequest(session: RestSession<any>): HttpRestRequest {
		return new HttpRestRequest(session);
	}

	/**
	 * Selects the MIME type  of the data transfer object that shall be accepted as a valid
	 * response payload for this {@link HttpRestRequest}.
	 *
	 * @param mimeType The MIME type  of the transfer data object that shall be accepted as a valid response payload for
	 *                 this {@link HttpRestRequest}.
	 * @return The {@link HttpRestRequest} instance itself.
	 */
	public setAcceptHeader(mimeType: string): HttpRestRequest {
		this.acceptHeader = mimeType;

		return this;
	}

	/**
	 * sets an additional {@link HttpHeaders} for this {@link AxiosRequestConfig}
	 *
	 * @param key The {@link HttpHeaders} to set
	 * @param value The value of the header
	 * @return The {@link HttpRestRequest} instance itself.
	 */
	public setAdditionalHeader(key: HttpHeaders, value: string): HttpRestRequest {
		if (typeof this.requestConfig.headers === "undefined") {
			this.requestConfig.headers = {} as AxiosRequestHeaders;
		}

		this.requestConfig.headers[key] = value;
		return this;
	}

	/**
	 * Prepare the {@link HttpRestRequest} to execute the selected {@link HttpMethod} on the given resource path
	 * ({@link URL}) and providing the given httpEntity as it´s data transfer object (parameters).
	 *
	 * @param httpMethod   The {@link HttpMethod} to execute.
	 * @param url          The resource url to execute the request on.
	 * @param contentType  The content type of the given http entity.
	 * @param httpEntity   The data to include in the request´s content.
	 * @param authMaterial The {@link AuthMaterial} to use for authorization.
	 * @return The {@link HttpRestRequest} instance itself.
	 * @throws ResultException Shall be thrown, if creating initializing the {@link HttpRestRequest} failed for the
	 *                         given parameters.
	 */
	public async buildRequest(
		httpMethod: HttpMethod, url: URL, httpEntity?: any, contentType?: string, authMaterial?: AuthMaterial
	): Promise<HttpRestRequest> {
		switch (httpMethod) {
			case HttpMethod.GET:
			case HttpMethod.POST:
			case HttpMethod.DELETE:
			case HttpMethod.PUT:
			case HttpMethod.HEAD:
				this.requestConfig.method = httpMethod;
				break;
			default:
				throw new ClientResultException(WsclientErrors.UNKNOWN_HTTP_METHOD);
		}

		this.requestConfig.url = url.toString();

		if (typeof this.requestConfig.responseEncoding === "undefined") {
			this.requestConfig.responseEncoding = "utf8";
		}

		if (typeof this.requestConfig.maxContentLength === "undefined") {
			this.requestConfig.maxContentLength = Infinity;
		}

		if (typeof this.requestConfig.maxBodyLength === "undefined") {
			this.requestConfig.maxBodyLength = Infinity;
		}

		if (typeof this.requestConfig.headers === "undefined") {
			this.requestConfig.headers = {} as AxiosRequestHeaders;
		}

		if (typeof this.requestConfig.headers[HttpHeaders.CONTENT_TYPE] === "undefined" &&
			typeof contentType !== "undefined") {
			this.requestConfig.headers[HttpHeaders.CONTENT_TYPE] = contentType;
		}

		this.requestConfig.headers[HttpHeaders.ACCEPT] = this.acceptHeader;
		if (this.acceptHeader === DataFormats.JSON.getMimeType()) {
			this.requestConfig.responseType = "json";
		} else if (this.acceptHeader === DataFormats.OCTET_STREAM.getMimeType()) {
			this.requestConfig.responseType = "arraybuffer";
		}

		let authorizationHeader: AxiosRequestHeaders | undefined;
		if (typeof authMaterial !== "undefined") {
			authorizationHeader = authMaterial.getAuthHeader();
		} else {
			authorizationHeader = (await this.session.getAuthProvider().provide(this.session)).getAuthHeader()
		}

		if (typeof authorizationHeader !== "undefined") {
			this.requestConfig.headers = {...this.requestConfig.headers, ...authorizationHeader};
		}

		if (typeof httpEntity !== "undefined") {
			this.requestConfig.data = httpEntity;
		}

		return this;
	}

	/**
	 * Sets a {@link AbortSignal} object that allows you to communicate with a DOM request (such as a Fetch) and abort it
	 * if required via an {@link AbortController} object.
	 *
	 * @param signal The {@link AbortSignal} object used in an {@link AbortController}
	 * @return The {@link HttpRestRequest} instance itself.
	 */
	public setAbortSignal(signal?: AbortSignal): HttpRestRequest {
		this.requestConfig.signal = signal;

		return this;
	}

	/**
	 * Sets a callback function receiving {@link AxiosProgressEvent}s to be called if the running upload progresses
	 *
	 * @param callback The function to be called when the upload progresses
	 * @return The {@link HttpRestRequest} instance itself.
	 */
	public setOnUploadProgress(callback?: (progressEvent: AxiosProgressEvent) => void): HttpRestRequest {
		this.requestConfig.onUploadProgress = callback;

		return this;
	}

	/**
	 * Sets A callback function receiving {@link AxiosProgressEvent}s to be called if the running download progresses
	 *
	 * @param callback The function to be called when the download progresses
	 * @return The {@link HttpRestRequest} instance itself.
	 */
	public setOnDownloadProgress(callback?: (progressEvent: AxiosProgressEvent) => void): HttpRestRequest {
		this.requestConfig.onDownloadProgress = callback;

		return this;
	}

	/**
	 * <p>
	 * Checks whether the given {@link AxiosResponse} represents a failure state and in that case shall rethrow the
	 * failure state in form of a matching {@link ResultException}.
	 * </p>
	 * <p>
	 * Should the failure state represent a server side failure is shall throw a {@link ServerResultException}.<br>
	 * </p>
	 *
	 * @param httpResponse The {@link AxiosResponse} to check for a failure state.
	 * @throws ResultException Shall be thrown, if the {@link AxiosResponse} represents a failure state.
	 * @see ServerResultException
	 */
	private async checkResponse(httpResponse: AxiosResponse): Promise<void> {
		// any error?
		let code: number | undefined = httpResponse.status;
		if (typeof code !== "undefined" && code >= HttpStatusCode.OK && code < HttpStatusCode.MULTIPLE_CHOICES) {
			return;
		}

		// get the response
		let data: any = httpResponse.data;
		if (typeof data === "undefined") {
			throw new ClientResultException(WsclientErrors.HTTP_EMPTY_ENTITY);
		}

		let exceptionMessage: string = httpResponse.statusText;

		// is this a webPDF server response or a general server error?
		let contentType = httpResponse.headers[HttpHeaders.CONTENT_TYPE.toLowerCase()];
		if (DataFormats.JSON.matches(contentType)) {
			let wsException: ServerResultException = ServerResultException.createWebserviceException(
				data.errorMessage,
				data.errorCode,
				data.stackTrace
			);

			if (wsException.getErrorCode() !== 0) {
				throw wsException;
			}
		}

		if (typeof data === "string") {
			exceptionMessage = data;
		}

		// throw the extracted error message
		throw new ClientResultException(WsclientErrors.HTTP_CUSTOM_ERROR)
			.appendMessage(exceptionMessage)
			.setHttpErrorCode(code);
	}

	/**
	 * <p>
	 * Executes {@link HttpRestRequest} and shall attempt to translate the response´s data to an instance of the given type.
	 *
	 * @return The resulting data transfer object {@link AxiosResponse} result data.
	 * </p>
	 */
	public async executeRequest(): Promise<any> {
		let response: AxiosResponse = await this.execute();

		return response.data;
	}

	/**
	 * <p>
	 * Executes {@link HttpRestRequest}.
	 * </p>
	 * <p>
	 * The resulting intermediate {@link AxiosResponse} shall be checked via {@link #checkResponse(ClassicHttpResponse)}}.
	 * </p>
	 *
	 * @return The resulting data transfer object {@link AxiosResponse}.
	 * @throws ResultException Shall be thrown, should the {@link AxiosResponse} not be readable or should it´s
	 *         validation via {@link #checkResponse(ClassicHttpResponse)} fail.
	 */
	public async execute(): Promise<AxiosResponse> {
		if (typeof this.requestConfig.url === "undefined") {
			throw new ClientResultException(WsclientErrors.INVALID_URL);
		}

		let response: AxiosResponse;

		try {
			response = await this.session.getHttpClient().request(this.requestConfig);
		} catch (e: any) {
			let error: AxiosError = e;

			if (typeof error.response !== "undefined") {
				await this.checkResponse(error.response);
			}

			throw ServerResultException.createWebserviceException(
				error.message, error.status || error.response?.status, error.stack
			);
		}

		await this.checkResponse(response);
		return response;
	}
}
