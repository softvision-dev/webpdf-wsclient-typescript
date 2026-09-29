/**
 * Captured shape of the last HTTP request a manager issued through a stub session created by
 * {@link createStubSession}.
 */
export interface CapturedRequest {
	method?: string;
	url?: string;
	headers?: Record<string, unknown>;
	signal?: AbortSignal;
}

/**
 * A non-2xx answer the stub session shall deliver instead of a successful response. The stub rejects the
 * request the way axios does for such a status: with an error carrying the full {@code response}, so the
 * request layer's error handling runs exactly as against a real server.
 */
export class StubHttpFailure {
	public readonly status: number;
	public readonly statusText: string;
	public readonly headers: Record<string, string>;
	public readonly data: unknown;

	/**
	 * @param status     The HTTP status code of the answer.
	 * @param statusText The HTTP reason phrase of the answer.
	 * @param headers    The response headers, with lower-case names as axios delivers them.
	 * @param data       The response body as axios would deliver it (a string for an HTML or empty body).
	 */
	public constructor(status: number, statusText: string, headers: Record<string, string>, data: unknown) {
		this.status = status;
		this.statusText = statusText;
		this.headers = headers;
		this.data = data;
	}
}

/**
 * Builds a stub RestSession sufficient for the REST managers that only need URL resolution, an auth
 * provider and an HTTP client: it resolves URLs the same way {@link AbstractSession#getURL} does, supplies
 * a bearer auth provider ({@code Authorization: Bearer TEST}) and routes HTTP requests through the supplied
 * response factory while capturing the request config for assertions.
 *
 * The response factory returns the JSON body of a 200 answer, or a {@link StubHttpFailure} to make the
 * request fail like axios does for a non-2xx status.
 *
 * @param captured        Receives the method, URL, headers and abort signal of the last request.
 * @param responseFactory Produces the answer for the captured request config.
 * @return The stub session, to be passed to a manager constructor.
 */
export function createStubSession(
	captured: CapturedRequest,
	responseFactory: (config: any) => any
): any {
	return {
		getURL: (subPath: string, parameters?: URLSearchParams): URL => {
			let url: URL = new URL("http://localhost/webPDF/rest/" + subPath);
			if (typeof parameters !== "undefined") {
				parameters.forEach((value: string, key: string): void => url.searchParams.append(key, value));
			}
			return url;
		},
		getAuthProvider: (): any => ({
			provide: async (): Promise<any> => ({
				getAuthHeader: (): any => ({Authorization: "Bearer TEST"})
			})
		}),
		getHttpClient: (): any => ({
			request: async (config: any): Promise<any> => {
				captured.method = config.method;
				captured.url = config.url;
				captured.headers = config.headers;
				captured.signal = config.signal;

				let answer: any = responseFactory(config);
				if (answer instanceof StubHttpFailure) {
					// Mirrors the AxiosError axios rejects with for a status outside 2xx.
					let error: any = new Error("Request failed with status code " + answer.status);
					error.isAxiosError = true;
					error.status = answer.status;
					error.response = {
						status: answer.status,
						statusText: answer.statusText,
						headers: answer.headers,
						data: answer.data,
						config: config
					};
					throw error;
				}
				return {status: 200, headers: {"content-type": "application/json"}, data: answer};
			}
		})
	};
}
