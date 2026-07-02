import {AbstractViewerManager} from "./AbstractViewerManager";
import {ViewerManager} from "./ViewerManager";
import {RestWebServiceDocument} from "../documents";

/**
 * Concrete {@link ViewerManager} for {@link RestWebServiceDocument}-based sessions.
 */
export class RestViewerManager extends AbstractViewerManager<RestWebServiceDocument>
	implements ViewerManager<RestWebServiceDocument> {

}
