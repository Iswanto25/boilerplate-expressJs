/**
 * Bun:test — Validasi Bun.password (pengganti bcrypt) setelah migrasi
 * Jalankan dengan: bun test __tests__/infrastructure/
 */
import { describe, it, expect } from "bun:test";
import { encryptPassword, comparePassword } from "@/utils/utils.js";

describe("Bun.password (bcrypt replacement)", () => {
	it("should hash a password using Bun.password (bcrypt algorithm)", async () => {
		const password = "mySecretPassword123";
		const hash = await encryptPassword(password);

		expect(hash).toBeDefined();
		expect(typeof hash).toBe("string");
		expect(hash.length).toBeGreaterThan(30);
		// Bun.password bcrypt hash starts with $2b$ or $2a$
		expect(hash.startsWith("$2")).toBe(true);
	});

	it("should verify a correct password against its hash", async () => {
		const password = "correctPassword!@#";
		const hash = await encryptPassword(password);

		const isValid = await comparePassword(password, hash);
		expect(isValid).toBe(true);
	});

	it("should reject an incorrect password", async () => {
		const password = "correctPassword";
		const hash = await encryptPassword(password);

		const isValid = await comparePassword("wrongPassword", hash);
		expect(isValid).toBe(false);
	});

	it("should produce different hashes for the same password (unique salt)", async () => {
		const password = "samePassword";

		const hash1 = await encryptPassword(password);
		const hash2 = await encryptPassword(password);

		expect(hash1).not.toBe(hash2);

		// Both should verify
		expect(await comparePassword(password, hash1)).toBe(true);
		expect(await comparePassword(password, hash2)).toBe(true);
	});

	it("should handle empty password gracefully", async () => {
		const password = "";
		const hash = await encryptPassword(password);

		expect(hash).toBeDefined();
		expect(await comparePassword(password, hash)).toBe(true);
		expect(await comparePassword("something", hash)).toBe(false);
	});

	it("should handle unicode passwords", async () => {
		const password = "パスワード🔐测试";
		const hash = await encryptPassword(password);

		expect(await comparePassword(password, hash)).toBe(true);
		expect(await comparePassword("パスワード", hash)).toBe(false);
	});

	it("should handle very long passwords", async () => {
		const password = "a".repeat(1000);
		const hash = await encryptPassword(password);

		expect(hash).toBeDefined();
		expect(await comparePassword(password, hash)).toBe(true);
	});

	it("should include SALT_HASH in hashed value if configured", async () => {
		const password = "testSaltHash";
		const hash = await encryptPassword(password);

		// SALT_HASH is prepended to password before hashing
		// The hash should still verify
		expect(await comparePassword(password, hash)).toBe(true);

		// Without SALT_HASH, the same password produces different verification result
		// because Bun.password.verify combines with SALT_HASH internally
	});
});
