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

	it("returns false for a missing content type instead of throwing", function (): void {
		// An error response without a Content-Type header must not throw — the real server
		// error must not be masked by a TypeError from calling split on undefined.
		expect(DataFormats.JSON.matches(undefined as unknown as string)).to.equal(false);
		expect(DataFormats.JSON.matches(null as unknown as string)).to.equal(false);
	});
});
