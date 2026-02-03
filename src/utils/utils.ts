import moment from "moment";
import { customAlphabet } from "nanoid";
import bcrypt from "bcryptjs";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
moment.locale("id");

export function randomString(): string {
	const nanoid = customAlphabet(alphabet, 10);
	const datePart = moment().format("YYYYMMDD");
	const randomPart = nanoid();
	return `${datePart}-${randomPart}`;
}

export function encryptPassword(password: string): string {
	const salt = bcrypt.genSaltSync(10);
	return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
	return bcrypt.compareSync(password, hash);
}

export function isEmailValid(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function isPhoneNumberValid(phoneNumber: string): boolean {
	const phoneRegex = /^[0-9]{10}$/;
	return phoneRegex.test(phoneNumber);
}

export function generateOTP(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}
