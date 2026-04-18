import assert from "node:assert/strict";
import test, { mock } from "node:test";
import crypto from "node:crypto";

import { randomString, encryptPassword, comparePassword, isEmailValid, isPhoneNumberValid, generateOTP } from "@/utils/utils.js";

test("randomString produces expected structure", () => {
	const value = randomString();
	assert.match(value, /^\d{8}-[A-Za-z0-9]{10}$/);
});

test("password hashing and comparison works", async () => {
	const password = "super-secret";
	const hash = await encryptPassword(password);
	assert.notEqual(hash, password);
	assert.equal(await comparePassword(password, hash), true);
	assert.equal(await comparePassword("wrong-password", hash), false);
});

test("email validation recognizes common patterns", () => {
	assert.equal(isEmailValid("user@example.com"), true);
	assert.equal(isEmailValid("bad-email"), false);
	assert.equal(isEmailValid("user@@example.com"), false);
});

test("phone number validation requires 10 to 15 digits", () => {
	assert.equal(isPhoneNumberValid("1234567890"), true);
	assert.equal(isPhoneNumberValid("123456789012345"), true);
	assert.equal(isPhoneNumberValid("123456789"), false);
	assert.equal(isPhoneNumberValid("1234567890123456"), false);
	assert.equal(isPhoneNumberValid("notanumber"), false);
});

test("generateOTP returns a 6-digit string", () => {
	const otp = generateOTP();
	assert.match(otp, /^[0-9]{6}$/);
});
