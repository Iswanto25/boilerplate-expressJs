import { describe, expect, test } from "bun:test";
import { randomString, encryptPassword, comparePassword, isEmailValid, isPhoneNumberValid, generateOTP } from "@/utils/utils.js";

describe("Utils", () => {
	test("randomString produces expected structure", () => {
		const value = randomString();
		expect(value).toMatch(/^\d{8}-[A-Za-z0-9]{10}$/);
	});

	test("password hashing and comparison works", async () => {
		const password = "super-secret";
		const hash = await encryptPassword(password);
		expect(hash).not.toBe(password);
		expect(await comparePassword(password, hash)).toBe(true);
		expect(await comparePassword("wrong-password", hash)).toBe(false);
	});

	test("email validation recognizes common patterns", () => {
		expect(isEmailValid("user@example.com")).toBe(true);
		expect(isEmailValid("bad-email")).toBe(false);
		expect(isEmailValid("user@@example.com")).toBe(false);
	});

	test("phone number validation requires 10 to 15 digits", () => {
		expect(isPhoneNumberValid("1234567890")).toBe(true);
		expect(isPhoneNumberValid("123456789012345")).toBe(true);
		expect(isPhoneNumberValid("123456789")).toBe(false);
		expect(isPhoneNumberValid("1234567890123456")).toBe(false);
		expect(isPhoneNumberValid("notanumber")).toBe(false);
	});

	test("generateOTP returns a 6-digit string", () => {
		const otp = generateOTP();
		expect(otp).toMatch(/^[0-9]{6}$/);
	});
});
