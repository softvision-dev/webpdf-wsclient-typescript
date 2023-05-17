import {AuthMaterial} from "./material";
import {Session} from "../Session";

/**
 * <p>
 * A class implementing {@link AuthenticationProvider} shall provide {@link AuthMaterial} for a {@link Session} via it´s
 * {@link #provide(Session)} method.
 * </p>
 * <p>
 * <b>Be aware:</b> An implementation of {@link AuthenticationProvider} is not required to serve multiple {@link Session}s
 * at a time. It is expected to create a new {@link AuthenticationProvider} for each existing {@link Session}.
 * </p>
 */
export interface AuthenticationProvider {
	/**
	 * Provides authorization {@link SessionToken} for a {@link Session}.
	 *
	 * @param session The session to provide authorization for.
	 * @return The {@link AuthMaterial} provided by this {@link AuthenticationProvider}.
	 * @throws AuthResultException Shall be thrown, should the authentication/authorization fail for some reason.
	 */
	provide(session: Session): Promise<AuthMaterial>;

	/**
	 * Refresh authorization {@link SessionToken} for an active {@link Session}.
	 *
	 * @param session The session to refresh the authorization for.
	 * @return The {@link AuthMaterial} refreshed by this {@link AuthenticationProvider}.
	 * @throws AuthResultException Shall be thrown, should the authentication/authorization fail for some reason.
	 */
	refresh(session: Session): Promise<AuthMaterial>;
}