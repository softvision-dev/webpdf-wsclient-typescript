import {expect} from 'chai';
import {ClientResultException, RestDocument, RestSession, SessionContext, SessionFactory, UserAuthProvider, WebServiceProtocol} from "../../../main/typescript";
import {ServerType, TestConfig, TestServer} from "../testsuite";
import {KeyStorePassword, UserCertificates, UserCredentials} from "../../../main/typescript/generated-sources";

require("../bootstrap");

describe("RestWebserviceLdapTest", function () {
	let testServer: TestServer = new TestServer();

	it('testHandleRestSessionLdapCertificates', async function () {
		if (!TestConfig.instance.getIntegrationTestConfig().isLdapTestsActive()) {
			this.skip();
			return;
		}

		let certificates: UserCertificates | undefined;
		let parameter: KeyStorePassword;
		let keyStoreName: string = "";

		// check User
		let session: RestSession<RestDocument> = await SessionFactory.createInstance(
			new SessionContext(WebServiceProtocol.REST, testServer.getServer(ServerType.LOCAL)),
			new UserAuthProvider("bmi", "billymiller")
		);

		expect(session, "Valid session should have been created.").to.exist;
		let user: UserCredentials = await session.getUser();
		expect(user.isUser, "User should be user.").to.be.true;
		certificates = await session.getCertificates();
		expect(certificates, "User should have certificates object.").to.exist;
		expect(certificates.keyStores.length, "User should have keystores.").to.be.greaterThan(0);

		for (let keystore of certificates?.keyStores || []) {
			if (keystore.keyStoreName!.indexOf("PRINCIPAL") !== -1) {
				keyStoreName = keystore.keyStoreName!;
				expect(keystore.isKeyStoreAccessible, "keystore should not be accessible.").to.be.false;
			}
		}

		expect(certificates!.certificates.length, "User should have certificates.").to.be.greaterThan(0);

		// check errorneous
		parameter = KeyStorePassword.fromJson({
			keyStorePassword: "test"
		} as KeyStorePassword);
		try {
			await session.updateCertificates("error", parameter);
		} catch (e: any) {
			expect(e instanceof ClientResultException).to.be.true;
			let resultException: ClientResultException = e;
			expect(resultException.getErrorCode(), "HTTP IO error expected").to.equal(-34);
			expect(resultException.getHttpErrorCode(), "bad request expected").to.equal(400);
		}

		certificates = await session.updateCertificates(keyStoreName, parameter);
		for (let keystore of certificates?.keyStores || []) {
			if (keystore.keyStoreName === keyStoreName) {
				expect(keystore.isKeyStoreAccessible, "keystore should not be accessible.").to.be.false;
				break;
			}
		}

		// unlock keystore
		parameter = KeyStorePassword.fromJson({
			keyStorePassword: "bmi"
		} as KeyStorePassword);
		certificates = await session.updateCertificates(keyStoreName, parameter);
		expect(certificates, "User should have certificates object.").to.exist;
		expect(certificates!.keyStores.length, "User should have a keystore.").to.be.greaterThan(0);

		for (let keystore of certificates?.keyStores || []) {
			if (keystore.keyStoreName === keyStoreName) {
				expect(keystore.isKeyStoreAccessible, "keystore should be accessible.").to.be.true;
				break;
			}
		}

		expect(certificates!.certificates.length, "User should have certificates.").to.be.greaterThan(0);

		for (let certificate of certificates!.certificates) {
			if (certificate.aliasName === "billymiller") {
				expect(certificate.keyStoreName, "keystore name should match this certificate.").to.equal(keyStoreName);
				expect(certificate.hasPrivateKey, "this certificate should have a private key.").to.be.true;
				expect(certificate.isPrivateKeyReadable, "this certificates private key should not be readable.").to.be.false;
			} else if (certificate.aliasName === "billy") {
				expect(certificate.keyStoreName, "keystore name should match this certificate.").to.equal(keyStoreName);
				expect(certificate.hasPrivateKey, "this certificate should have a private key.").to.be.true;
				expect(certificate.isPrivateKeyReadable, "this certificates private key should be readable.").to.be.true;
			}
		}

		// unlock with wrong certificate password
		parameter = KeyStorePassword.fromJson({
			aliases: {
				"billymiller": "error"
			},
			keyStorePassword: "bmi"
		});
		certificates = await session.updateCertificates(keyStoreName, parameter);
		for (let certificate of certificates!.certificates) {
			if (certificate.aliasName === "billymiller") {
				expect(certificate.isPrivateKeyReadable, "this certificates private key should not be readable.").to.be.false;
			}
		}

		// unlock certificate
		parameter = KeyStorePassword.fromJson({
			aliases: {
				"billymiller": "billymiller",
				"billy": ""
			},
			keyStorePassword: "bmi"
		});
		certificates = await session.updateCertificates(keyStoreName, parameter);
		for (let certificate of certificates!.certificates) {
			if (certificate.aliasName === "billymiller") {
				expect(certificate.isPrivateKeyReadable, "this certificates private key should be readable.").to.be.true;
			}
		}

		await session.close();
	});
});

