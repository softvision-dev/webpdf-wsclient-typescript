import {expect} from "chai";
import {it, suite} from "mocha";
import {DataFormats} from "../../../main/typescript";

suite("DataFormatTest", function (): void {
	it("matches a JSON content type with and without parameters", function (): void {
		expect(DataFormats.JSON.matches("application/json")).to.equal(true);
		expect(DataFormats.JSON.matches("application/json; charset=utf-8")).to.equal(true);
	});

	it("does not match a different content type", function (): void {
		expect(DataFormats.JSON.matches("text/plain")).to.equal(false);
	});

	it("returns false for a missing content type instead of throwing (regression: B1)", function (): void {
		// Simulates an error response that carries no Content-Type header. The previous
		// implementation called String.prototype.split on undefined and threw a TypeError,
		// masking the real server error. It must now return false without throwing.
		expect(DataFormats.JSON.matches(undefined as unknown as string)).to.equal(false);
		expect(DataFormats.JSON.matches(null as unknown as string)).to.equal(false);
	});
});
