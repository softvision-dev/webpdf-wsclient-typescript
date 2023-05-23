/**
 * <p>
 * {@link TLSProtocol} enumerates all currently supported TLS (Transport Layer Security) protocol versions for encrypted
 * HTTPS connections.
 * </p>
 * <p>
 * <b>Information:</b> TLS is the follow up protocol of the (better known) SSL (Secure Socket Layer) protocol - SSL is
 * no longer supported by the webPDF wsclient, as it is obsolete and insecure.
 * </p>
 *
 * @see #TLSV1
 * @see #TLSV1_1
 * @see #TLSV1_2
 * @see #TLSV1_3
 */
export enum TLSProtocol {
    /**
     * Transport Layer Security (protocol) version 1.0
     */
    TLSV1 = "TLSv1",

    /**
     * Transport Layer Security (protocol) version 1.1
     */
    TLSV1_1 = "TLSv1.1",

    /**
     * Transport Layer Security (protocol) version 1.2
     */
    TLSV1_2 = "TLSv1.2",

    /**
     * Transport Layer Security (protocol) version 1.3
     */
    TLSV1_3 = "TLSv1.3"
}
