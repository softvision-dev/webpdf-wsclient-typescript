import {RestSession} from "../RestSession";
import {RestDocument} from "../documents";
import {ViewerExternalDocument, ViewerProfilePublicView} from "../../../generated-sources";

/**
 * <p>
 * A class implementing {@link ViewerManager} provides access to the public, unauthenticated viewer
 * tenant endpoints of a {@link RestSession} — the endpoints backing the webPDF-hosted viewer URL.
 * </p>
 * <p>
 * These reads are public (field-allowlisted on the server) and never require administrator rights;
 * the administrative profile CRUD is provided separately by the
 * {@link import("../administration").AdministrationManager}.
 * </p>
 *
 * @param <T_REST_DOCUMENT> The {@link RestDocument} used by the currently active {@link RestSession}.
 */
export interface ViewerManager<T_REST_DOCUMENT extends RestDocument> {
	/**
	 * Returns the {@link RestSession} used by this {@link ViewerManager}.
	 *
	 * @return The {@link RestSession} used by this {@link ViewerManager}.
	 */
	getSession(): RestSession<T_REST_DOCUMENT>;

	/**
	 * Reads the public, allowlisted viewer profile for the given tenant. An unknown or empty tenant
	 * id resolves to the default profile server-side, so this endpoint always returns a profile and
	 * never a 404.
	 *
	 * @param tenantId The identifier of the viewer tenant profile to resolve. An unknown or empty
	 *                 value resolves to the default profile.
	 * @param options  Optional request options, e.g. an {@link AbortSignal} to enforce a timeout.
	 * @return The resolved {@link ViewerProfilePublicView}.
	 * @throws ResultException Shall be thrown, if the request failed.
	 */
	fetchProfile(tenantId: string, options?: {abortSignal?: AbortSignal}): Promise<ViewerProfilePublicView>;

	/**
	 * Validates an external document URL the hosted viewer wants to load against the tenant's
	 * {@code externalUrlAllowlist}. Only https URLs whose host is allowlisted are accepted; the
	 * server validates only and never fetches the target. An empty or unset allowlist denies every
	 * target.
	 *
	 * @param tenantId The identifier of the viewer tenant profile to resolve.
	 * @param url      The external https document URL to validate (encoded transparently).
	 * @param options  Optional request options, e.g. an {@link AbortSignal} to enforce a timeout.
	 * @return The validated {@link ViewerExternalDocument}.
	 * @throws ResultException Shall be thrown, if the target is missing, not an https URL, or not
	 *                         allowlisted for the tenant.
	 */
	validateExternalDocument(
		tenantId: string, url: string, options?: {abortSignal?: AbortSignal}
	): Promise<ViewerExternalDocument>;

	/**
	 * Streams an asset file (logo, custom CSS, font, …) of the tenant's viewer profile. The asset
	 * name is resolved inside the profile folder with a strict path-containment check.
	 * <p>
	 * <b>Note:</b> the {@link ViewerProfilePublicView} branding already exposes ready-to-use public
	 * asset URLs ({@code logoUrl} / {@code customCssUrl}); this method is provided for callers that
	 * need the raw asset bytes.
	 * </p>
	 *
	 * @param tenantId The identifier of the viewer tenant profile to resolve.
	 * @param name     The profile-relative asset file name.
	 * @param options  Optional request options, e.g. an {@link AbortSignal} to enforce a timeout.
	 * @return The asset file content as a {@link Uint8Array}.
	 * @throws ResultException Shall be thrown, if the asset does not exist or the request failed.
	 */
	fetchAsset(tenantId: string, name: string, options?: {abortSignal?: AbortSignal}): Promise<Uint8Array>;
}
