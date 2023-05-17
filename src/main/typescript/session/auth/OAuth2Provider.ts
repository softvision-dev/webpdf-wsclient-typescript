import {AuthenticationProvider} from "./AuthenticationProvider";
import {Session} from "../Session";
import {OAuth2Token} from "./material";

/**
 * <p>
 * A class implementing {@link OAuth2Provider} shall implement a {@link #provide(Session)} method
 * to determine a {@link OAuth2Token} for the authorization of a {@link Session}.<br>
 * This interface is directly intended to enable you, to implement your own custom authorization provider - refer to the
 * <a href="https://github.com/softvision-dev/webpdf-wsclient/wiki/OAuth2">wiki</a> for examples.
 * </p>
 * <p>
 * <b>Be aware:</b> An implementation of {@link AuthenticationProvider} is not required to serve multiple {@link Session}s
 * at a time. It is expected to create a new {@link AuthenticationProvider} for each existing {@link Session}.
 * </p>
 */
export interface OAuth2Provider extends AuthenticationProvider {
	/**
	 * Provides an {@link OAuth2Token} for the authorization of a {@link Session}.
	 *
	 * @param session The {@link Session} to provide authorization for.
	 * @return The {@link OAuth2Token} to authorize the {@link Session} with.
	 * @throws AuthResultException Shall be thrown, should the authorization fail for some reason.
	 *                             (Use {@link AuthResultException} to wrap exceptions, that might occur during your
	 *                             authorization request.)
	 */
	provide(session: Session): Promise<OAuth2Token>;
}
