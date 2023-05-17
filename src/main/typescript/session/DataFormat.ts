import { Session } from "./Session";

/**
 * A {@link DataFormat} for a {@link Session}´s data transfer objects.
 */
export class DataFormat {
    private _mimeType: string;

    /**
     * Created a {@link DataFormat} representing the given MIME-type.
     *
     * @param mimeType The MIME-type represented by the {@link DataFormat}.
     */
    public constructor(mimeType: string) {
        this._mimeType = mimeType;
    }

    /**
     * Return the MIME-type represented by this {@link DataFormat}.
     *
     * @return The MIME-type represented by this {@link DataFormat}.
     */
    public getMimeType(): string {
        return this._mimeType;
    }

    /**
     * Returns true should the given MIME-type match the selected {@link DataFormat}.
     *
     * @param mimeType The MIME-type to check.
     * @return true should the given MIME-type match the selected {@link DataFormat}.
     */
    public matches(mimeType: string): boolean {
        return this.getMimeType() === mimeType;
    }

    /**
     * Returns a {@link String} representation of the selected {@link DataFormat}.
     *
     * @return A {@link String} representation of the selected {@link DataFormat}.
     */
    public toString(): string {
        return this.getMimeType();
    }
}

/**
 * {@link DataFormats} bundle all known formats for a {@link Session}´s data transfer objects.
 *
 * @see #XML
 * @see #JSON
 * @see #OCTET_STREAM
 * @see #PLAIN
 * @see #ANY
 */
export const DataFormats = {
    /**
     * Extensible Markup Language
     */
    XML: new DataFormat("application/xml"),

    /**
     * JavaScript Object Notation
     */
    JSON: new DataFormat("application/json"),

    /**
     * An unspecified binary stream.
     */
    OCTET_STREAM: new DataFormat("application/octet-stream"),

    /**
     * A plain text.
     */
    PLAIN: new DataFormat("text/plain"),

    /**
     * unspecified file format.
     */
    ANY: new DataFormat("*/*")
}