import {expect} from "chai";
import {it, suite} from "mocha";
import {
	ClientResultException,
	DataFormats,
	HttpMethod,
	HttpRestRequest,
	ServerResultException,
	WsclientErrors
} from "../../../main/typescript/index.js";
import {CapturedRequest, createStubSession, StubHttpFailure} from "./StubRestSession.js";

/**
 * A token endpoint of an external OAuth provider; the request never leaves the stub session.
 */
const TOKEN_URL: string = "https://login.example.com/tenant/oauth2/v2.0/token";

/**
 * The body an OAuth provider answers a rejected refresh grant with (RFC 6749, section 5.2), including the
 * provider-specific extension fields.
 */
function oauthErrorBody(): Record<string, unknown> {
	return {
		error: "invalid_grant",
		error_description: "AADSTS700084: The refresh token was issued to a single page app and has expired.",
		error_codes: [700084],
		error_uri: "https://login.example.com/error?code=700084"
	};
}

/**
 * Encodes the given value as the UTF-8 JSON bytes axios delivers for a response read as {@code arraybuffer}.
 */
function jsonBytes(value: unknown): ArrayBuffer {
	let bytes: Uint8Array = new TextEncoder().encode(JSON.stringify(value));
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Awaits the given promise and returns what it rejected with; fails the test when it resolves.
 */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
	} catch (error: unknown) {
		return error;
	}
	expect.fail("the request was expected to fail");
}

/**
 * Sends a POST to the token endpoint through the real request path of {@link HttpRestRequest}, against a
 * stub session that answers with the given failure, and returns what the request rejected with.
 *
 * @param failure      The non-2xx answer the stub session delivers.
 * @param captured     Receives the request the stub session saw.
 * @param acceptHeader The Accept header to send, or {@code undefined} for the default (JSON).
 */
async function failedRequest(
	failure: StubHttpFailure, captured: CapturedRequest, acceptHeader?: string
): Promise<unknown> {
	let session: any = createStubSession(captured, (): StubHttpFailure => failure);
	let request: HttpRestRequest = HttpRestRequest.createRequest(session);
	if (typeof acceptHeader !== "undefined") {
		request.setAcceptHeader(acceptHeader);
	}
	await request.buildRequest(
		HttpMethod.POST, new URL(TOKEN_URL), "grant_type=refresh_token", "application/x-www-form-urlencoded"
	);
	return rejectionOf(request.executeRequest());
}

suite("HttpRestRequestErrorBodyTest", function (): void {
	it("keeps the parsed JSON body of a non-webPDF error answer next to its status code", async function (): Promise<void> {
		let captured: CapturedRequest = {};
		let error: unknown = await failedRequest(
			new StubHttpFailure(400, "Bad Request", {"content-type": "application/json; charset=utf-8"}, oauthErrorBody()),
			captured
		);

		expect(captured.url, "the request must have reached the HTTP client").to.equal(TOKEN_URL);
		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
		expect(clientError.getHttpErrorCode()).to.equal(400);
		expect(clientError.getHttpResponseBody()).to.deep.equal(oauthErrorBody());
	});

	it("does not copy the error body into the exception message", async function (): Promise<void> {
		let error: unknown = await failedRequest(
			new StubHttpFailure(400, "Bad Request", {"content-type": "application/json; charset=utf-8"}, oauthErrorBody()),
			{}
		);

		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\nBad Request");
		expect(clientError.toString()).to.equal(clientError.getMessage());
		for (let text of [clientError.getMessage(), clientError.toString(), clientError.message]) {
			expect(text).to.not.contain("AADSTS700084");
			expect(text).to.not.contain("invalid_grant");
		}
	});

	it("keeps a text body as the string the server sent", async function (): Promise<void> {
		let page: string = "<html><head><title>502 Bad Gateway</title></head><body>upstream unavailable</body></html>";
		let error: unknown = await failedRequest(
			new StubHttpFailure(502, "Bad Gateway", {"content-type": "text/html"}, page),
			{}
		);

		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
		expect(clientError.getHttpErrorCode()).to.equal(502);
		expect(clientError.getHttpResponseBody()).to.equal(page);
		// Unchanged behaviour: a text body has always been the message detail.
		expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\n" + page);
	});

	it("keeps a JSON body read as bytes as the parsed object", async function (): Promise<void> {
		let error: unknown = await failedRequest(
			new StubHttpFailure(400, "Bad Request", {"content-type": "application/json"}, jsonBytes(oauthErrorBody())),
			{},
			DataFormats.OCTET_STREAM.getMimeType()
		);

		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.getHttpErrorCode()).to.equal(400);
		expect(clientError.getHttpResponseBody()).to.not.be.instanceOf(ArrayBuffer);
		expect(clientError.getHttpResponseBody()).to.deep.equal(oauthErrorBody());
	});

	it("leaves the body undefined when the error answer has no body", async function (): Promise<void> {
		let error: unknown = await failedRequest(
			new StubHttpFailure(400, "Bad Request", {}, undefined),
			{}
		);

		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.equalsError(WsclientErrors.HTTP_EMPTY_ENTITY)).to.equal(true);
		expect(clientError.getHttpResponseBody()).to.equal(undefined);
	});

	it("still reports a webPDF error answer as a ServerResultException", async function (): Promise<void> {
		let error: unknown = await failedRequest(
			new StubHttpFailure(401, "Unauthorized", {"content-type": "application/json"}, {
				errorCode: -9009,
				errorMessage: "The session token has expired.",
				stackTrace: ""
			}),
			{}
		);

		expect(error).to.be.instanceOf(ServerResultException);
		expect(error).to.not.be.instanceOf(ClientResultException);
		expect((error as ServerResultException).getErrorCode()).to.equal(-9009);
		expect((error as ServerResultException).message).to.equal("The session token has expired.");
	});

	it("has no body until one is set, and sets it fluently", function (): void {
		let exception: ClientResultException = new ClientResultException(WsclientErrors.HTTP_CUSTOM_ERROR);
		expect(exception.getHttpResponseBody()).to.equal(undefined);

		let body: Record<string, unknown> = oauthErrorBody();
		let returned: ClientResultException = exception.setHttpResponseBody(body);
		expect(returned).to.equal(exception);
		expect(exception.getHttpResponseBody()).to.equal(body);
	});
});
