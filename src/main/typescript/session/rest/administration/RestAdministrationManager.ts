import {AbstractAdministrationManager} from "./AbstractAdministrationManager.js";
import {AdministrationManager} from "./AdministrationManager.js";
import {RestWebServiceDocument} from "../documents/index.js";

/**
 * A class implementing {@link RestAdministrationManager} administrates and monitors the webPDF server configurations.
 *
 * @param <RestWebServiceDocument> The {@link RestDocument} used by the currently active {@link RestSession}.
 */
export class RestAdministrationManager extends AbstractAdministrationManager<RestWebServiceDocument>
	implements AdministrationManager<RestWebServiceDocument> {

}