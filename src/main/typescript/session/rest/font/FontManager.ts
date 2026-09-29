import {RestSession} from "../RestSession.js";
import {RestDocument} from "../documents/index.js";
import {FontCatalog, FontMetrics, FontPreviewPage} from "../../../generated-sources/index.js";

/**
 * <p>
 * A class implementing {@link FontManager} provides access to the font endpoints ({@code /portal/fonts/...})
 * of a {@link RestSession}: the catalog of the fonts the web services 'toolbox' and 'converter' can use, the
 * previews of the catalog families and the metrics of a single font cut.
 * </p>
 * <p>
 * <b>Note:</b> these endpoints are intended for internal use by the webPDF portal and may change without
 * notice. All of them require a session (an authorized request; the server answers {@code 401} without a
 * token).
 * </p>
 * <p>
 * Caching: the answer of {@link FontManager#fetchCatalog} carries a strong ETag, which a browser revalidates
 * transparently. The answer of {@link FontManager#fetchPreviewPage} never changes for its key and is immutable.
 * The answer of {@link FontManager#fetchMetrics} never changes for its identifier and code points as long as the
 * metrics are usable; metrics with {@code usable = false} are sent as not cacheable and shall not be kept, since
 * the server checks the cut again on the next request. While the server is still computing an answer it
 * responds with {@code 503}; the request can then be repeated after a short delay.
 * </p>
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} used by the currently active {@link RestSession}.
 */
export interface FontManager<T_REST_DOCUMENT extends RestDocument> {
	/**
	 * Returns the {@link RestSession} used by this {@link FontManager}.
	 *
	 * @return The {@link RestSession} used by this {@link FontManager}.
	 */
	getSession(): RestSession<T_REST_DOCUMENT>;

	/**
	 * Reads the font catalog: the fonts of the web services 'toolbox' and 'converter', keyed by web service.
	 * A source whose web service does not run carries its status only and no font data.
	 *
	 * @param options Optional request options, e.g. an {@link AbortSignal} to enforce a timeout.
	 * @return The {@link FontCatalog}.
	 * @throws ResultException Shall be thrown, if the request failed, e.g. with the HTTP status {@code 503}
	 *                         while the catalog is still being computed.
	 */
	fetchCatalog(options?: {abortSignal?: AbortSignal}): Promise<FontCatalog>;

	/**
	 * Reads one preview page of the font catalog: the previews of up to 100 consecutive families, each family
	 * name drawn in the cut the family is listed with first.
	 *
	 * @param key     The key of the preview page, as listed in the {@code previewPages} of a catalog source.
	 * @param options Optional request options, e.g. an {@link AbortSignal} to enforce a timeout.
	 * @return The {@link FontPreviewPage} of the given key.
	 * @throws ResultException Shall be thrown, if the key is unknown (HTTP status {@code 404}), the page is still
	 *                         being computed (HTTP status {@code 503}), or the request failed.
	 */
	fetchPreviewPage(key: string, options?: {abortSignal?: AbortSignal}): Promise<FontPreviewPage>;

	/**
	 * Reads the metrics of a font cut as the watermark operation lays a text out with it, including the
	 * outlines of the requested characters.
	 * <p>
	 * The code points are sent sorted numerically in ascending order and without duplicates, as the server
	 * requires that canonical form; the given array is not modified. Without code points (none given or an
	 * empty array) the request carries no {@code codepoints} parameter. The server accepts at most 512 code
	 * points per request, each an integer between 0 and 1114111 that is not a surrogate, and answers any other
	 * input with the HTTP status {@code 400}; this method does not check those limits itself.
	 * </p>
	 *
	 * @param id         The identifier of the cut, as listed in the {@code cuts} of a catalog family.
	 * @param codepoints Optional Unicode code points of the characters the metrics are requested for.
	 * @param options    Optional request options, e.g. an {@link AbortSignal} to enforce a timeout.
	 * @return The {@link FontMetrics} of the cut.
	 * @throws ResultException Shall be thrown, if the identifier or the code points are not of the required form
	 *                         (HTTP status {@code 400}), the identifier is unknown (HTTP status {@code 404}), the
	 *                         request waited too long (HTTP status {@code 503}), or the request failed.
	 */
	fetchMetrics(
		id: string, codepoints?: Array<number>, options?: {abortSignal?: AbortSignal}
	): Promise<FontMetrics>;
}
