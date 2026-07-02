import {RestDocument} from "../documents";
import {RestSession} from "../RestSession";
import {ViewerExternalDocument, ViewerProfilePublicView} from "../../../generated-sources";
import {DataFormats} from "../../DataFormat";
import {ViewerManager} from "./ViewerManager";
import {HttpMethod, HttpRestRequest} from "../../connection";
import {wsclientConfiguration} from "../../../configuration";

/**
 * An instance of {@link ViewerManager} provides access to the public, unauthenticated viewer tenant
 * endpoints of the webPDF server ({@code /viewer/...}).
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} used by the currently active {@link RestSession}.
 */
export abstract class AbstractViewerManager<T_REST_DOCUMENT extends RestDocument>
	implements ViewerManager<T_REST_DOCUMENT> {
	private readonly session: RestSession<T_REST_DOCUMENT>;

	/**
	 * Initializes a {@link ViewerManager} for the given {@link RestSession}.
	 *
	 * @param session The {@link RestSession} a {@link ViewerManager} shall be created for.
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
	public async fetchProfile(
		tenantId: string, options?: {abortSignal?: AbortSignal}
	): Promise<ViewerProfilePublicView> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAbortSignal(options?.abortSignal)
			.buildRequest(
				HttpMethod.GET,
				this.session.getURL("viewer/" + encodeURIComponent(tenantId) + "/profile")
			);

		return ViewerProfilePublicView.fromJson(await request.executeRequest());
	}

	/**
	 * @inheritDoc
	 */
	public async validateExternalDocument(
		tenantId: string, url: string, options?: {abortSignal?: AbortSignal}
	): Promise<ViewerExternalDocument> {
		let searchParams: URLSearchParams = new URLSearchParams();
		searchParams.set("target", AbstractViewerManager.toBase64Url(url));

		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAbortSignal(options?.abortSignal)
			.buildRequest(
				HttpMethod.GET,
				this.session.getURL("viewer/" + encodeURIComponent(tenantId) + "/external", searchParams)
			);

		return ViewerExternalDocument.fromJson(await request.executeRequest());
	}

	/**
	 * @inheritDoc
	 */
	public async fetchAsset(
		tenantId: string, name: string, options?: {abortSignal?: AbortSignal}
	): Promise<Uint8Array> {
		let request: HttpRestRequest = await HttpRestRequest.createRequest(this.session)
			.setAcceptHeader(DataFormats.OCTET_STREAM.getMimeType())
			.setAbortSignal(options?.abortSignal)
			.buildRequest(
				HttpMethod.GET,
				this.session.getURL(
					"viewer/" + encodeURIComponent(tenantId) + "/assets/" + encodeURIComponent(name)
				)
			);

		return new Uint8Array(await request.executeRequest());
	}

	/**
	 * Encodes the given value as a URL-safe (base64url) string, matching the {@code target} query
	 * parameter contract of {@code GET /viewer/{tenantId}/external}. The server decodes base64url
	 * (URL-safe alphabet, padding tolerated).
	 *
	 * @param value The value to encode.
	 * @return The base64url-encoded value.
	 */
	private static toBase64Url(value: string): string {
		return wsclientConfiguration.btoa(value)
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
	}
}
