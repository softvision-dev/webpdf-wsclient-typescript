/**
 * <p>
 * A known webPDF {@link WsclientError}.
 * </p>
 */
export class WsclientError {
    private readonly code: number;
    private readonly message: string;

    /**
     * Instantiates an {@link WsclientError} representing the given error code and message.
     *
     * @param code    The error code represented by the created {@link WsclientError}.
     * @param message The error message describing the {@link WsclientError}.
     */
    public constructor(code: number, message: string) {
        this.code = code;
        this.message = message;
    }

    /**
     * Returns the {@link WsclientError} representing the given errorCode.
     *
     * @param errorCode The errorCode an {@link WsclientError} shall be found for.
     * @return The {@link WsclientError} representing the given errorCode.
     */
    public static getName(errorCode: number) {
        for (let value of Object.values(WsclientErrors)) {
            if (value.getCode() === errorCode) {
                return value;
            }
        }

        return WsclientErrors.UNKNOWN_EXCEPTION;
    }

    /**
     * Returns the numeric wsclient error code.
     *
     * @return the numeric wsclient error code.
     */
    getCode(): number {
        return this.code;
    }

    /**
     * Returns an error message describing the {@link WsclientError}.
     *
     * @return ane error message describing the {@link WsclientError}.
     */
    getMessage(): string {
        return this.message;
    }

    /**
     * Returns true, if this {@link WsclientError} is representing the same failure state, as the given
     * {@link WsclientError}. (false otherwise.)
     *
     * @param error The {@link WsclientError} to compare this {@link WsclientError with.}
     * @return true, if this {@link WsclientError} is representing the same failure state, as the given
     * {@link WsclientError}. (false otherwise.)
     */
    public equals(error: WsclientError): boolean {
        return error.code === this.code && error.message === this.message;
    }
}

/**
 * <p>
 * {@link WsclientErrors} bundles the known webPDF wsclient errors.
 * </p>
 * <p>
 * <b>Important:</b> The bundled error codes are explicitly handling wsclient failures, and should not be confused
 * with the webPDF server´s error codes.
 * </p>
 */
export const WsclientErrors = {
    /**
     * An unexpected Exception has occurred, the wsclient does not define a matching fallback behaviour for the
     * situation.
     */
    UNKNOWN_EXCEPTION: new WsclientError(-1, "Unknown exception."),

    /**
     * The selected webservice protocol ist unknown, currently only {@link WebServiceProtocol#REST} is supported.
     */
    UNKNOWN_WEBSERVICE_PROTOCOL: new WsclientError(-2, "The selected webservice protocol is unknown."),

    /**
     * The selected webservice type is unknown, the wsclient is not prepared to execute requests to that endpoint.
     * Possibly the selected wsclient version does not match that of your webPDF server?
     */
    UNKNOWN_WEBSERVICE_TYPE: new WsclientError(-3, "The selected webservice type is not available."),

    /**
     * The selected source document could not be read, please check whether it exists and is accessible.
     */
    INVALID_SOURCE_DOCUMENT: new WsclientError(-5, "Invalid file source."),

    /**
     * An HTTP request´s/response´s content could not be translated to valid XML or JSON.
     */
    INVALID_HTTP_MESSAGE_CONTENT: new WsclientError(-6, "Failed to deserialize XML/JSON HTTP message content."),

    /**
     * The selected document/documentID is not known to the document manager, try uploading the document first.
     */
    INVALID_DOCUMENT: new WsclientError(-7, "The found document is invalid."),

    /**
     * History data could not be found for the given document/documentID, try uploading the document first and check
     * whether your webPDF server is running and reachable and whether collecting history data is enabled.
     */
    INVALID_HISTORY_DATA: new WsclientError(-10, "Invalid history parameter."),

    /**
     * <p>
     * Creating a REST Webservice call failed for the given session. Please check whether the selected
     * {@link WebServiceProtocol} matches that of your session.<br>
     * To produce {@link RestWebService} instances you require the protocol type {@link WebServiceProtocol#REST} and
     * must also provide a {@link RestSession}.
     * </p>
     */
    INVALID_WEBSERVICE_SESSION: new WsclientError(-11, "Creating a webservice instance failed for the selected session."),

    /**
     * <p>
     * This error should never occur, the webPDF server should either provide a valid result document, or should
     * provide a proper exception, that should have been parsed and thrown prior to this, but the server did neither.<br>
     * </p>
     * <p>
     * At the moment of writing this, no scenario is known where this might ever be the case.<br>
     * <b>However:</b> future webservices might not necessarily return a result document.<br>
     * Please check whether the used wsclient version matches your webPDF server.
     * </p>
     */
    INVALID_RESULT_DOCUMENT: new WsclientError(-12, "The resulting document is invalid"),

    /**
     * <p>
     * The given URL (or URI) is not well-formed and does not point to a valid resource.<br>
     * </p>
     * <p>
     * A {@link Session} was unable to create a proper baseURL or subPath from the {@link URL} provided to the
     * {@link SessionContext} - please check if that URL is correct.
     * </p>
     */
    INVALID_URL: new WsclientError(-30, "Invalid URL."),

    /**
     * An error has occurred, while processing your HTTP/HTTPS request. Please check whether the webPDF server is
     * running and reachable, also you might want to check your configured {@link SessionContext}.
     */
    HTTP_IO_ERROR: new WsclientError(-31, "HTTP/HTTPS IO error."),

    /**
     * Initializing the {@link Agent} failed, please check your TLS settings.
     */
    TLS_INITIALIZATION_FAILURE: new WsclientError(-32, "TLS agent initialization failed."),

    /**
     * The request failed unexpectedly. The server´s response is empty.
     */
    HTTP_EMPTY_ENTITY: new WsclientError(-33, "HTTP entity is empty"),

    /**
     * The response is not as expected, it may contain an error description.
     */
    HTTP_CUSTOM_ERROR: new WsclientError(-34, "HTTP custom error"),

    /**
     * The used HTTP method is unknown. The currently supported HTTP methods are {@link HttpMethod#GET},
     * {@link HttpMethod#PUT}, {@link HttpMethod#POST} and {@link HttpMethod#DELETE}.
     */
    UNKNOWN_HTTP_METHOD: new WsclientError(-35, "Unknown HTTP method"),

    /**
     * The used webservice protocol is unknown. The currently supported protocols are {@link WebServiceProtocol#REST}.
     */
    UNKNOWN_SESSION_TYPE: new WsclientError(-36, "Unknown session type"),

    /**
     * <p>
     * Failed to parse a given JSON or XML source.<br>
     * Should this fail to parse a given raw OperationData stream: Please check, whether the operation data is well
     * formed.
     * </p>
     */
    XML_OR_JSON_CONVERSION_FAILURE: new WsclientError(-37, "Unable to convert to XML/JSON"),

    /**
     * The provided authentication/authorization material is invalid and a session may not be established.
     */
    INVALID_AUTH_MATERIAL: new WsclientError(-40, "Authentication/authorization material is invalid"),

    /**
     * Authentication of the session failed for the provided material - please check whether the webPDF server is
     * running and reachable and whether the provided authentication material is correct.
     */
    AUTHENTICATION_FAILURE: new WsclientError(-41, "The session authentication failed"),

    /**
     * <p>
     * Refreshing the session token failed - please check whether the webPDF server is running and reachable.<br>
     * Alternatively your access and refresh token expired in the meantime und you need to reauthorize.
     * </p>
     */
    SESSION_REFRESH_FAILURE: new WsclientError(-42, "Refreshing the session token failed"),

    /**
     * A client side REST execution error occurred.
     */
    REST_EXECUTION: new WsclientError(-53, "REST web service execution error"),

    /**
     * An {@link Error} has occurred during the authentication/authorization step.
     * (look at the providing {@link AuthResultException}´s cause for more details.)
     */
    AUTH_ERROR: new WsclientError(-54, "Authentication/Authorization failure."),

    /**
     * User access violation. An Administration role user is required.
     */
    ADMIN_PERMISSION_ERROR: new WsclientError(-55, "Admin permission required.")
}