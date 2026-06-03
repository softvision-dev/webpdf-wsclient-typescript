import {ClientResultException, WsclientErrors} from "../../../exception";

/**
 * A single body part of a parsed {@code multipart/*} message.
 */
export interface MultipartPart {
	/**
	 * The {@code Content-Type} declared by this body part, or {@code undefined} if the part carried no such header.
	 */
	contentType?: string;

	/**
	 * The raw, byte-exact body of this part (without the part headers and without the trailing boundary CRLF).
	 */
	data: Buffer;
}

const HEADER_SEPARATOR: Buffer = Buffer.from("\r\n\r\n");

/**
 * Extracts the boundary token from a {@code multipart/*} {@code Content-Type} header value. The boundary may be given
 * quoted or unquoted (RFC 2046).
 *
 * @param contentType The {@code Content-Type} header value, e.g. {@code multipart/mixed; boundary="abc"}.
 * @return The boundary token.
 * @throws ResultException Shall be thrown, should no boundary be present.
 */
function extractBoundary(contentType: string): string {
	let match: RegExpExecArray | null = /;\s*boundary=(?:"([^"]+)"|([^";]+))/i.exec(contentType);
	if (match === null) {
		throw new ClientResultException(WsclientErrors.HTTP_IO_ERROR);
	}

	return (match[1] ?? match[2]).trim();
}

/**
 * Returns the {@code Content-Type} declared in the given raw part-header block, or {@code undefined} if none is set.
 *
 * @param headerText The raw header block of a single multipart body part.
 * @return The declared {@code Content-Type} (parameters stripped), or {@code undefined}.
 */
function extractPartContentType(headerText: string): string | undefined {
	for (let line of headerText.split("\r\n")) {
		let separator: number = line.indexOf(":");
		if (separator !== -1 && line.substring(0, separator).trim().toLowerCase() === "content-type") {
			return line.substring(separator + 1).split(";")[0].trim();
		}
	}

	return undefined;
}

/**
 * <p>
 * Parses an in-memory {@code multipart/*} message body (e.g. {@code multipart/mixed}) into its body parts. The parsing
 * is byte-exact and therefore safe for binary parts; only the part headers are interpreted as text.
 * </p>
 * <p>
 * This is a deliberately small, dependency-free parser tailored to webPDF responses: it splits on the boundary derived
 * from the {@code Content-Type} header, separates each part's header block from its body, and skips the multipart
 * preamble/epilogue and the closing delimiter. It does not interpret transfer encodings or folded headers.
 * </p>
 *
 * @param body        The raw multipart message body.
 * @param contentType The response {@code Content-Type} header, carrying the multipart boundary.
 * @return The parsed {@link MultipartPart}s, in document order.
 * @throws ResultException Shall be thrown, should the {@code Content-Type} carry no boundary.
 */
export function parseMultipartMixed(body: Buffer, contentType: string): MultipartPart[] {
	let delimiter: Buffer = Buffer.from("--" + extractBoundary(contentType));
	let parts: MultipartPart[] = [];

	let boundaryIndex: number = body.indexOf(delimiter);
	while (boundaryIndex !== -1) {
		let afterDelimiter: number = boundaryIndex + delimiter.length;

		// The closing delimiter ("--boundary--") terminates the multipart body.
		if (body.subarray(afterDelimiter, afterDelimiter + 2).toString("latin1") === "--") {
			break;
		}

		let nextBoundary: number = body.indexOf(delimiter, afterDelimiter);
		if (nextBoundary === -1) {
			break;
		}

		let headerEnd: number = body.indexOf(HEADER_SEPARATOR, afterDelimiter);
		if (headerEnd !== -1 && headerEnd < nextBoundary) {
			let headerText: string = body.subarray(afterDelimiter, headerEnd).toString("latin1");
			let bodyStart: number = headerEnd + HEADER_SEPARATOR.length;

			// The body runs up to the CRLF that precedes the next boundary delimiter.
			let bodyEnd: number = nextBoundary;
			if (bodyEnd - bodyStart >= 2 && body.subarray(bodyEnd - 2, bodyEnd).toString("latin1") === "\r\n") {
				bodyEnd -= 2;
			}

			parts.push({
				contentType: extractPartContentType(headerText),
				data: Buffer.from(body.subarray(bodyStart, bodyEnd))
			});
		}

		boundaryIndex = nextBoundary;
	}

	return parts;
}
