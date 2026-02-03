import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { randomString, encryptPassword, comparePassword, isEmailValid, isPhoneNumberValid, generateOTP } from "../utils";

test("randomString produces expected structure", () => {
	const value = randomString();
	assert.match(value, /^\d{8}-[A-Za-z0-9]{10}$/);
});

test("password hashing and comparison works", () => {
	const password = "super-secret";
	const hash = encryptPassword(password);
	assert.notEqual(hash, password);
	assert.equal(comparePassword(password, hash), true);
	assert.equal(comparePassword("wrong-password", hash), false);
});

test("email validation recognizes common patterns", () => {
	assert.equal(isEmailValid("user@example.com"), true);
	assert.equal(isEmailValid("bad-email"), false);
	assert.equal(isEmailValid("user@@example.com"), false);
});

test("phone number validation requires exactly 10 digits", () => {
	assert.equal(isPhoneNumberValid("1234567890"), true);
	assert.equal(isPhoneNumberValid("123456789"), false);
	assert.equal(isPhoneNumberValid("12345678901"), false);
	assert.equal(isPhoneNumberValid("notanumber"), false);
});

test("generateOTP returns a deterministic 6-digit string when Math.random is mocked", () => {
	const restore = mock.method(Math, "random", () => 0.123456);
	const otp = generateOTP();
	restore.mock.restore();

	assert.equal(otp, "211110");
	assert.match(otp, /^[0-9]{6}$/);
});
