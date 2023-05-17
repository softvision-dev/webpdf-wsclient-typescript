import {AbstractAdministrationManager} from "./AbstractAdministrationManager";
import {AdministrationManager} from "./AdministrationManager";
import {RestWebServiceDocument} from "../documents";

/**
 * A class implementing {@link RestAdministrationManager} administrates and monitors the webPDF server configurations.
 *
 * @param <RestWebServiceDocument> The {@link RestDocument} used by the currently active {@link RestSession}.
 */
export class RestAdministrationManager extends AbstractAdministrationManager<RestWebServiceDocument>
	implements AdministrationManager<RestWebServiceDocument> {

}