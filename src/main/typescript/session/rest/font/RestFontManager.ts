import {AbstractFontManager} from "./AbstractFontManager.js";
import {FontManager} from "./FontManager.js";
import {RestWebServiceDocument} from "../documents/index.js";

/**
 * Concrete {@link FontManager} for {@link RestWebServiceDocument}-based sessions.
 */
export class RestFontManager extends AbstractFontManager<RestWebServiceDocument>
	implements FontManager<RestWebServiceDocument> {

}
