import {expect} from "chai";
import {it, suite} from "mocha";
import {WSClientSessionToken} from "../../../main/typescript";

suite("WSClientSessionTokenTest", function (): void {
	it("isExpired returns false for a non-expired token with zero skew",
		function (): void {
			let token: WSClientSessionToken = new WSClientSessionToken("ACCESS", "REFRESH", 3600);
			expect(token.isExpired(0)).to.equal(false);
		});

	it("isExpired returns false when expiresIn is absent or zero — schema default means no communicated expiry",
		function (): void {
			expect(new WSClientSessionToken("ACCESS", "REFRESH", undefined).isExpired(0)).to.equal(false);
			expect(new WSClientSessionToken("ACCESS", "REFRESH", 0).isExpired(0)).to.equal(false);
			expect(new WSClientSessionToken("ACCESS", "REFRESH", -1).isExpired(0)).to.equal(false);
		});

	it("isExpired treats skewTime as seconds — a 30 s skew makes a 10 s token appear expired",
		function (): void {
			// Token expires in 10 seconds. A 30-second skew moves the effective deadline
			// past the token's expiry → must be considered expired.
			let token: WSClientSessionToken = new WSClientSessionToken("ACCESS", "REFRESH", 10);
			expect(token.isExpired(30)).to.equal(true);
		});

	it("isExpired returns false when skew is smaller than remaining lifetime",
		function (): void {
			let token: WSClientSessionToken = new WSClientSessionToken("ACCESS", "REFRESH", 3600);
			expect(token.isExpired(60)).to.equal(false);
		});

	it("getExpiration returns null when no expiry was communicated",
		function (): void {
			let token: WSClientSessionToken = new WSClientSessionToken("ACCESS", "REFRESH", undefined);
			expect(token.getExpiration()).to.equal(null);
		});

	it("getExpiration returns a Date when expiresIn is positive",
		function (): void {
			let token: WSClientSessionToken = new WSClientSessionToken("ACCESS", "REFRESH", 3600);
			expect(token.getExpiration()).to.be.instanceOf(Date);
		});
});
