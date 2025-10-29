import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const requireModule = createRequire(__filename);
const modulePath = "../encryption";

const reloadEncryptionModule = async () => {
	delete requireModule.cache[requireModule.resolve(modulePath)];
	return import(modulePath);
};

test("encrypt/decrypt roundtrip with hex key", async () => {
	process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("hex");

	const { encryptSensitive, decryptSensitive } = await reloadEncryptionModule();
	const payload = encryptSensitive("secret-data");
	assert.equal(payload.version, 1);
	assert.ok(payload.ciphertext.length > 0);

	const decrypted = decryptSensitive(payload);
	assert.equal(decrypted, "secret-data");
});

test("load key accepts base64 input", async () => {
	process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 2).toString("base64");

	const { encryptSensitive, decryptSensitive } = await reloadEncryptionModule();
	const payload = encryptSensitive("another secret");
	const decrypted = decryptSensitive(payload);
	assert.equal(decrypted, "another secret");
});

test("throws when DATA_ENCRYPTION_KEY missing", async () => {
	delete process.env.DATA_ENCRYPTION_KEY;
	const { encryptSensitive } = await reloadEncryptionModule();

	assert.throws(() => encryptSensitive("boom"), /DATA_ENCRYPTION_KEY is required/);
});
