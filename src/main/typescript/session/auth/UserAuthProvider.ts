import {AbstractAuthenticationProvider} from "./AbstractAuthenticationProvider";
import {AuthenticationMaterial, AuthMaterial} from "./material";
import {ClientResultException, WsclientErrors} from "../../exception";
import {AuthenticationProvider} from "./AuthenticationProvider";

/**
 * <p>
 * An instance of {@link UserAuthProvider} shall provide {@link AuthenticationMaterial} for the authentication of a
 * webPDF user.
 * </p>
 * <p>
 * <b>Be aware:</b> Currently an {@link UserAuthProvider} shall only serve one {@link Session} at a
 * time. An {@link UserAuthProvider} being called by another {@link Session} than it´s current master,
 * shall assume it´s current master to have expired and shall, try to reauthorize that new {@link Session}
 * (new master).<br>
 * For that reason an {@link UserAuthProvider}s shall be reusable by subsequent {@link Session}s.
 * </p>
 * <p>
 * <b>Be aware:</b> However - An implementation of {@link AuthenticationProvider} is not required to serve multiple
 * {@link Session}s at a time. It is expected to create a new {@link AuthenticationProvider} for each existing
 * {@link Session}.
 * </p>
 */
export class UserAuthProvider extends AbstractAuthenticationProvider {
    /**
     * <p>
     * Creates a new {@link UserAuthProvider} for the given userName and password.<br>
     * <b>Be aware:</b> The given values may not be empty. Use the {@link AnonymousAuthProvider} to create anonymous
     * {@link Session}s.
     * </p>
     * <p>
     * Resumes an existing authentication provider, that shall resume a {@link Session} if {@link AuthMaterial} is
     * provided.
     * </p>
     * <p>
     * <b>Be aware:</b> Currently an {@link UserAuthProvider} shall only serve one {@link Session} at a
     * time. An {@link UserAuthProvider} being called by another {@link Session} than it´s current master,
     * shall assume it´s current master to have expired and shall, try to reauthorize that new {@link Session}
     * (new master).<br>
     * For that reason an {@link UserAuthProvider}s shall be reusable by subsequent {@link Session}s.
     * </p>
     *
     * @param userName The name of the user to authenticate.
     * @param password The password of the user to authenticate.
     * @param authMaterial The optional {@link AuthMaterial} to resume the {@link Session} with.
     */
    public constructor(userName: string, password: string, authMaterial?: AuthMaterial) {
        super(new AuthenticationMaterial(userName, password), authMaterial);

        if (userName.length === 0 || password.length == 0) {
            throw new ClientResultException(WsclientErrors.INVALID_AUTH_MATERIAL);
        }
    }
}