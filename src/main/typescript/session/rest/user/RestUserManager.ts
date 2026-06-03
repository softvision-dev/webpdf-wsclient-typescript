import {AbstractUserManager} from "./AbstractUserManager";
import {UserManager} from "./UserManager";
import {RestWebServiceDocument} from "../documents";

/**
 * Concrete {@link UserManager} for {@link RestWebServiceDocument}-based sessions.
 */
export class RestUserManager extends AbstractUserManager<RestWebServiceDocument>
	implements UserManager<RestWebServiceDocument> {

}
