import {Document} from "./Document";

/**
 * An instance of {@link AbstractDocument} represents a document as it is processed/created by a {@link WebService} or
 * uploaded to the webPDF server.
 */
export abstract class AbstractDocument implements Document {
    private readonly _source?: URL;

    /**
     * Prepares the given {@link URL} as a new {@link Document} for the processing by webPDF webservices.
     *
     * @param source The {@link URL} source of the document.
     */
    public constructor(source?: URL) {
        this._source = source;
    }

    /**
     * Returns the {@link URL} of the document.
     *
     * @return The {@link URL} of the document.
     */
    public getSource(): URL | undefined {
        return this._source;
    }
}
