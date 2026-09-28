import {AbstractViewerManager} from "./AbstractViewerManager.js";
import {ViewerManager} from "./ViewerManager.js";
import {RestWebServiceDocument} from "../documents/index.js";

/**
 * Concrete {@link ViewerManager} for {@link RestWebServiceDocument}-based sessions.
 */
export class RestViewerManager extends AbstractViewerManager<RestWebServiceDocument>
	implements ViewerManager<RestWebServiceDocument> {

}
