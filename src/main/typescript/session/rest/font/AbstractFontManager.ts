import {RestDocument} from "../documents/index.js";
import {RestSession} from "../RestSession.js";
import {
	FontCatalog,
	FontCut,
	FontFamily,
	FontGlyph,
	FontMetrics,
	FontPreview,
	FontPreviewPage,
	FontSource
} from "../../../generated-sources/index.js";
import {FontManager} from "./FontManager.js";
import {HttpMethod, HttpRestRequest} from "../../connection/index.js";

/**
 * An instance of {@link FontManager} provides access to the font endpoints of the webPDF server
 * ({@code /portal/fonts/...}).
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} used by the currently active {@link RestSession}.
 */
export abstract class AbstractFontManager<T_REST_DOCUMENT extends RestDocument>
	implements FontManager<T_REST_DOCUMENT> {
	private readonly session: RestSession<T_REST_DOCUMENT>;

	/**
	 * Initializes a {@link FontManager} for the given {@link RestSession}.
	 *
	 * @param session The {@link RestSession} a {@link FontManager} shall be created for.
	 */
	public constructor(session: RestSession<T_REST_DOCUMENT>) {
		this.session = session;
	}

	/**
	 * @inheritDoc
	 */
	public getSession(): RestSession<T_REST_DOCUMENT> {
		return this.session;
	}

	/**
	 * @inheritDoc
	 */
	public async fetchCatalog(options?: {abortSignal?: AbortSignal}): Promise<FontCatalog> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAbortSignal(options?.abortSignal)
			.buildRequest(HttpMethod.GET, this.session.getURL("portal/fonts"));

		return AbstractFontManager.hydrateCatalog(await request.executeRequest());
	}

	/**
	 * @inheritDoc
	 */
	public async fetchPreviewPage(key: string, options?: {abortSignal?: AbortSignal}): Promise<FontPreviewPage> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAbortSignal(options?.abortSignal)
			.buildRequest(
				HttpMethod.GET,
				this.session.getURL("portal/fonts/previews/" + encodeURIComponent(key))
			);

		return AbstractFontManager.hydratePreviewPage(await request.executeRequest());
	}

	/**
	 * @inheritDoc
	 */
	public async fetchMetrics(
		id: string, codepoints?: Array<number>, options?: {abortSignal?: AbortSignal}
	): Promise<FontMetrics> {
		let searchParams: URLSearchParams | undefined = undefined;
		if (codepoints !== undefined && codepoints.length > 0) {
			searchParams = new URLSearchParams();
			searchParams.set("codepoints", AbstractFontManager.toCanonicalCodepoints(codepoints));
		}

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAbortSignal(options?.abortSignal)
			.buildRequest(
				HttpMethod.GET,
				this.session.getURL("portal/fonts/metrics/" + encodeURIComponent(id), searchParams)
			);

		return AbstractFontManager.hydrateMetrics(await request.executeRequest());
	}

	/**
	 * Renders the given code points in the canonical form the server requires: sorted numerically in ascending
	 * order, without duplicates, decimal and separated by a comma. The canonical form also keeps the URL of an
	 * immutable, browser-cacheable answer stable. The given array is not modified.
	 *
	 * @param codepoints The code points to render.
	 * @return The value of the {@code codepoints} query parameter.
	 */
	private static toCanonicalCodepoints(codepoints: Array<number>): string {
		return Array.from(new Set<number>(codepoints))
			.sort((a: number, b: number): number => a - b)
			.join(",");
	}

	// The generated models leave some model-typed values raw: the code generator only casts the values of a map
	// ('FontCatalog.sources') and the required lists 'FontFamily.cuts', 'FontPreviewPage.previews' and
	// 'FontMetrics.glyphs'. The helpers below hydrate them, so that the declared types hold.

	/**
	 * Hydrates the given raw catalog, including all of its sources and the cuts of their families.
	 *
	 * @param data The raw catalog as received from the server.
	 * @return The hydrated {@link FontCatalog}.
	 */
	private static hydrateCatalog(data: any): FontCatalog {
		let catalog: FontCatalog = FontCatalog.fromJson(data);
		let sources: {[key: string]: FontSource} = {};

		for (let [name, source] of Object.entries<any>(data?.sources ?? {})) {
			let hydrated: FontSource = FontSource.fromJson(source);
			for (let family of hydrated?.families ?? []) {
				AbstractFontManager.hydrateFamily(family);
			}
			sources[name] = hydrated;
		}
		catalog.sources = sources;

		return catalog;
	}

	/**
	 * Replaces the raw cuts of the given family by {@link FontCut} instances.
	 *
	 * @param family The family to hydrate, modified in place.
	 */
	private static hydrateFamily(family: FontFamily): void {
		family.cuts = (family.cuts ?? []).map((cut: any): FontCut => FontCut.fromJson(cut));
	}

	/**
	 * Hydrates the given raw preview page, including its previews.
	 *
	 * @param data The raw preview page as received from the server.
	 * @return The hydrated {@link FontPreviewPage}.
	 */
	private static hydratePreviewPage(data: any): FontPreviewPage {
		let page: FontPreviewPage = FontPreviewPage.fromJson(data);
		page.previews = (data?.previews ?? []).map((preview: any): FontPreview => FontPreview.fromJson(preview));

		return page;
	}

	/**
	 * Hydrates the given raw font metrics, including their glyphs.
	 *
	 * @param data The raw font metrics as received from the server.
	 * @return The hydrated {@link FontMetrics}.
	 */
	private static hydrateMetrics(data: any): FontMetrics {
		let metrics: FontMetrics = FontMetrics.fromJson(data);
		metrics.glyphs = (data?.glyphs ?? []).map((glyph: any): FontGlyph => FontGlyph.fromJson(glyph));

		return metrics;
	}
}
