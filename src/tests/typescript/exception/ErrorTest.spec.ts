import {expect} from "chai";
import {WsclientError, WsclientErrors} from "../../../main/typescript";
import {it, suite} from "mocha";

suite("ErrorTest", function (): void {
	it('testError', async function (): Promise<void> {
		let error: WsclientError = WsclientError.getName(WsclientErrors.UNKNOWN_EXCEPTION.getCode());
		expect(WsclientErrors.UNKNOWN_EXCEPTION.getCode(), "Error-code should have been UNKNOWN").to.equal(error.getCode());
		expect(WsclientErrors.UNKNOWN_EXCEPTION.getMessage(), "Error-message should be according to UNKNOWN").to.equal(error.getMessage());

		error = WsclientError.getName(Infinity);
		expect(WsclientErrors.UNKNOWN_EXCEPTION.getCode(), "Error-code should have been UNKNOWN").to.equal(error.getCode());
		expect(WsclientErrors.UNKNOWN_EXCEPTION.getMessage(), "Error-message should be according to UNKNOWN").to.equal(error.getMessage());
	});
});