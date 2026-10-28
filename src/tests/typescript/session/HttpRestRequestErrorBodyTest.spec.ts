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
	return textBytes(JSON.stringify(value));
}

/**
 * Encodes the given text as the UTF-8 bytes a browser's axios delivers for a response read as {@code arraybuffer}:
 * an ArrayBuffer holding exactly these bytes.
 */
function textBytes(text: string): ArrayBuffer {
	let bytes: Uint8Array = new TextEncoder().encode(text);
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Bytes that do not belong to the response body; they surround a byte view in its backing buffer, so that reading
 * the whole backing buffer instead of the view yields a different text.
 */
const FOREIGN_BYTES: string = "#foreign#";

/**
 * Encodes the given text as the UTF-8 bytes axios delivers under Node.js for a response read as
 * {@code arraybuffer}: a Buffer, which is a view on a larger backing ArrayBuffer and not an ArrayBuffer itself.
 * The view starts behind and ends before foreign bytes of its backing buffer, as a Buffer taken from Node's pool
 * does. Asserts these preconditions, so a test using the view cannot pass on a plain, unshared buffer.
 */
function textBufferView(text: string): Buffer {
	let foreign: Buffer = Buffer.from(FOREIGN_BYTES, "utf8");
	let body: Buffer = Buffer.from(text, "utf8");
	let backing: Buffer = Buffer.alloc(foreign.length + body.length + foreign.length);
	foreign.copy(backing, 0);
	body.copy(backing, foreign.length);
	foreign.copy(backing, foreign.length + body.length);
	let view: Buffer = backing.subarray(foreign.length, foreign.length + body.length);

	expect(view, "a Buffer is a byte view, not an ArrayBuffer").to.not.be.instanceOf(ArrayBuffer);
	expect(view.byteOffset, "the view must start behind foreign bytes").to.be.greaterThan(0);
	expect(view.byteOffset + view.byteLength, "the view must end before foreign bytes")
		.to.be.lessThan(view.buffer.byteLength);
	expect(view.toString("utf8")).to.equal(text);
	return view;
}

/**
 * A form in which axios can deliver a response body that was read as {@code arraybuffer}.
 */
interface ByteForm {
	name: string;
	encode: (text: string) => ArrayBuffer | Buffer;
}

/**
 * The byte forms a response read as {@code arraybuffer} arrives in: an ArrayBuffer in the browser, a Buffer view
 * under Node.js.
 */
const BYTE_FORMS: ByteForm[] = [
	{name: "an ArrayBuffer", encode: textBytes},
	{name: "a Buffer view", encode: textBufferView}
];

/**
 * A webPDF error answer whose message needs more than ASCII, so that only a UTF-8 decoding reproduces it.
 */
function webpdfErrorBody(): Record<string, unknown> {
	return {
		errorCode: -5009,
		errorMessage: "Größenlimit überschritten (50 MB – €)",
		stackTrace: ""
	};
}

/**
 * A body declared as JSON that does not parse: a webPDF error answer cut off in the middle of a non-ASCII text.
 */
const TRUNCATED_JSON: string = "{\"errorCode\":-5009,\"errorMessage\":\"Größenlimit überschr";

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

	for (let form of BYTE_FORMS) {
		it("reports a webPDF error answer read as " + form.name + " as a ServerResultException", async function (): Promise<void> {
			let error: unknown = await failedRequest(
				new StubHttpFailure(400, "Bad Request", {"content-type": "application/json"},
					form.encode(JSON.stringify(webpdfErrorBody()))),
				{},
				DataFormats.OCTET_STREAM.getMimeType()
			);

			expect(error).to.be.instanceOf(ServerResultException);
			expect(error).to.not.be.instanceOf(ClientResultException);
			expect((error as ServerResultException).getErrorCode()).to.equal(-5009);
			expect((error as ServerResultException).message).to.equal(webpdfErrorBody().errorMessage);
		});

		it("keeps a JSON body read as " + form.name + " that does not parse as the decoded text", async function (): Promise<void> {
			let error: unknown = await failedRequest(
				new StubHttpFailure(502, "Bad Gateway", {"content-type": "application/json; charset=utf-8"},
					form.encode(TRUNCATED_JSON)),
				{},
				DataFormats.OCTET_STREAM.getMimeType()
			);

			expect(error).to.be.instanceOf(ClientResultException);
			let clientError: ClientResultException = error as ClientResultException;
			expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
			expect(clientError.getHttpErrorCode()).to.equal(502);
			expect(clientError.getHttpResponseBody()).to.equal(TRUNCATED_JSON);
			// Treated like any text body: the text is the message detail.
			expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\n" + TRUNCATED_JSON);
		});

		it("reports a JSON null body read as " + form.name + " with the status text", async function (): Promise<void> {
			let error: unknown = await failedRequest(
				new StubHttpFailure(500, "Internal Server Error", {"content-type": "application/json"},
					form.encode("null")),
				{},
				DataFormats.OCTET_STREAM.getMimeType()
			);

			expect(error).to.be.instanceOf(ClientResultException);
			let clientError: ClientResultException = error as ClientResultException;
			expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
			expect(clientError.getHttpErrorCode()).to.equal(500);
			expect(clientError.getHttpResponseBody()).to.equal(null);
			expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\nInternal Server Error");
		});
	}

	it("keeps a non-webPDF JSON body read as a Buffer view as the parsed object", async function (): Promise<void> {
		let error: unknown = await failedRequest(
			new StubHttpFailure(400, "Bad Request", {"content-type": "application/json"},
				textBufferView(JSON.stringify(oauthErrorBody()))),
			{},
			DataFormats.OCTET_STREAM.getMimeType()
		);

		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
		expect(clientError.getHttpErrorCode()).to.equal(400);
		expect(clientError.getHttpResponseBody()).to.not.be.instanceOf(Uint8Array);
		expect(clientError.getHttpResponseBody()).to.not.be.instanceOf(ArrayBuffer);
		expect(clientError.getHttpResponseBody()).to.deep.equal(oauthErrorBody());
		expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\nBad Request");
	});

	it("reports a JSON null body with the status text", async function (): Promise<void> {
		// axios delivers the parsed value, so a JSON body "null" arrives as null.
		let error: unknown = await failedRequest(
			new StubHttpFailure(500, "Internal Server Error", {"content-type": "application/json"}, null),
			{}
		);

		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
		expect(clientError.getHttpErrorCode()).to.equal(500);
		expect(clientError.getHttpResponseBody()).to.equal(null);
		expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\nInternal Server Error");
	});

	it("keeps a non-JSON body read as an ArrayBuffer as the bytes the server sent", async function (): Promise<void> {
		let page: ArrayBuffer = textBytes("<html><body>upstream unavailable</body></html>");
		let error: unknown = await failedRequest(
			new StubHttpFailure(502, "Bad Gateway", {"content-type": "text/html"}, page),
			{},
			DataFormats.OCTET_STREAM.getMimeType()
		);

		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
		expect(clientError.getHttpErrorCode()).to.equal(502);
		expect(clientError.getHttpResponseBody()).to.equal(page);
		expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\nBad Gateway");
	});

	it("reports an empty JSON body with the status text", async function (): Promise<void> {
		// axios delivers an empty body read as JSON as the empty string.
		let error: unknown = await failedRequest(
			new StubHttpFailure(502, "Bad Gateway", {"content-type": "application/json"}, ""),
			{}
		);

		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
		expect(clientError.getHttpErrorCode()).to.equal(502);
		expect(clientError.getHttpResponseBody()).to.equal("");
		expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\nBad Gateway");
	});

	for (let form of BYTE_FORMS) {
		it("reports an empty JSON body read as " + form.name + " with the status text", async function (): Promise<void> {
			let error: unknown = await failedRequest(
				new StubHttpFailure(502, "Bad Gateway", {"content-type": "application/json"}, form.encode("")),
				{},
				DataFormats.OCTET_STREAM.getMimeType()
			);

			expect(error).to.be.instanceOf(ClientResultException);
			let clientError: ClientResultException = error as ClientResultException;
			expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
			expect(clientError.getHttpErrorCode()).to.equal(502);
			expect(clientError.getHttpResponseBody()).to.equal("");
			expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\nBad Gateway");
		});
	}

	it("keeps a text body of an error answer without a content type as the message", async function (): Promise<void> {
		let text: string = "Service unavailable, the upstream server did not answer";
		let error: unknown = await failedRequest(
			new StubHttpFailure(503, "Service Unavailable", {}, text),
			{}
		);

		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
		expect(clientError.getHttpErrorCode()).to.equal(503);
		expect(clientError.getHttpResponseBody()).to.equal(text);
		expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\n" + text);
	});

	it("reports an empty body of an error answer without a content type with the status text", async function (): Promise<void> {
		let error: unknown = await failedRequest(
			new StubHttpFailure(503, "Service Unavailable", {}, ""),
			{}
		);

		expect(error).to.be.instanceOf(ClientResultException);
		let clientError: ClientResultException = error as ClientResultException;
		expect(clientError.equalsError(WsclientErrors.HTTP_CUSTOM_ERROR)).to.equal(true);
		expect(clientError.getHttpErrorCode()).to.equal(503);
		expect(clientError.getHttpResponseBody()).to.equal("");
		expect(clientError.getMessage()).to.equal(WsclientErrors.HTTP_CUSTOM_ERROR.getMessage() + "\nService Unavailable");
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
