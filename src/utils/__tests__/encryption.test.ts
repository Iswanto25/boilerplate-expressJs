import { test, describe, expect, mock } from "bun:test";
import { createRequire } from "node:module";

const requireModule = createRequire(__filename);
const modulePath = "@/utils/encryption";

const reloadEncryptionModule = async () => {
	delete requireModule.cache[requireModule.resolve(modulePath)];
	return import(modulePath);
};

test("encrypt/decrypt roundtrip with hex key", async () => {
	process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("hex");

	const { encryptSensitive, decryptSensitive } = await reloadEncryptionModule();
	const payload = encryptSensitive("secret-data");
	expect(payload.version).toBe(1);
	expect(payload.ciphertext.length > 0).toBeTruthy();

	const decrypted = decryptSensitive(payload);
	expect(decrypted).toBe("secret-data");
});

test("load key accepts base64 input", async () => {
	process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 2).toString("base64");

	const { encryptSensitive, decryptSensitive } = await reloadEncryptionModule();
	const payload = encryptSensitive("another secret");
	const decrypted = decryptSensitive(payload);
	expect(decrypted).toBe("another secret");
});

test("throws when DATA_ENCRYPTION_KEY missing", async () => {
	delete process.env.DATA_ENCRYPTION_KEY;
	const { encryptSensitive } = await reloadEncryptionModule();

	expect(() => encryptSensitive("boom")).toThrow(/DATA_ENCRYPTION_KEY is required/);
});
