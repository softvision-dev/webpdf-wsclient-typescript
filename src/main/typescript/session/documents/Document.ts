/**
 * A class implementing {@link Document} represents a document, as it is processed/created by a {@link WebService} or
 * uploaded to the webPDF server.
 */
export interface Document {
    /**
     * Returns the {@link URL} of the document.
     *
     * @return The {@link URL} of the document.
     */
    getSource(): URL | undefined
}
