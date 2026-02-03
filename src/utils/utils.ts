import moment from "moment";
import { customAlphabet } from "nanoid";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
moment.locale("id");

const nanoid = customAlphabet(alphabet, 10);
const saltHast = process.env.SALT_HASH || "default";
const saltRounds = process.env.SALT_ROUNDS || 5;

export function randomString(): string {
	const datePart = moment().format("YYYYMMDD");
	return `${datePart}-${nanoid()}`;
}

export async function encryptPassword(password: string): Promise<string> {
	const salt = await bcrypt.genSalt(Number(saltRounds));
	return await bcrypt.hash(`${password}-${saltHast}`, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(`${password}-${saltHast}`, hash);
}

export function isEmailValid(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function isPhoneNumberValid(phoneNumber: string): boolean {
	const phoneRegex = /^[0-9]{10,15}$/;
	return phoneRegex.test(phoneNumber);
}

export function generateOTP(): string {
	return crypto.randomInt(100000, 999999).toString();
}
