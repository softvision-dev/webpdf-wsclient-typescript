import {AbstractUserManager} from "./AbstractUserManager.js";
import {UserManager} from "./UserManager.js";
import {RestWebServiceDocument} from "../documents/index.js";

/**
 * Concrete {@link UserManager} for {@link RestWebServiceDocument}-based sessions.
 */
export class RestUserManager extends AbstractUserManager<RestWebServiceDocument>
	implements UserManager<RestWebServiceDocument> {

}
