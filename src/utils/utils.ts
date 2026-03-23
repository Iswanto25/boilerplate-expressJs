import bcrypt from "bcrypt";
import crypto from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ALPHABET_LENGTH = alphabet.length;

function cryptoRandomString(length: number): string {
	const bytes = crypto.randomBytes(length);
	return Array.from(bytes)
		.map((b) => alphabet[b % ALPHABET_LENGTH])
		.join("");
}

export function formatDate(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}${month}${day}`;
}

export function formatDateTime(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const saltHast = process.env.SALT_HASH || "default";
const saltRounds = process.env.SALT_ROUNDS || 5;

export function randomString(): string {
	const datePart = formatDate();
	return `${datePart}-${cryptoRandomString(10)}`;
}

export async function encryptPassword(password: string): Promise<string> {
	const salt = await bcrypt.genSalt(Number(saltRounds));
	return await bcrypt.hash(`${password}-${saltHast}`, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(`${password}-${saltHast}`, hash);
}

export function isEmailValid(email: string): boolean {
	// Pure string-based check — no regex, no backtracking risk (ReDoS-safe)
	const atIndex = email.indexOf("@");
	if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) return false;

	const local = email.slice(0, atIndex);
	const domain = email.slice(atIndex + 1);

	if (local.length === 0 || local.length > 64) return false;
	if (domain.length === 0 || domain.length > 255) return false;

	const dotIndex = domain.lastIndexOf(".");
	if (dotIndex <= 0 || dotIndex === domain.length - 1) return false;

	const tld = domain.slice(dotIndex + 1);
	if (tld.length < 2) return false;

	return true;
}

export function isPhoneNumberValid(phoneNumber: string): boolean {
	// Pure length + charCode check — no regex, guaranteed O(n), ReDoS-safe
	if (phoneNumber.length < 10 || phoneNumber.length > 15) return false;
	for (let i = 0; i < phoneNumber.length; i++) {
		const code = phoneNumber.codePointAt(i) ?? -1;
		if (code < 48 || code > 57) return false; // '0'–'9'
	}
	return true;
}

export function generateOTP(): string {
	return crypto.randomInt(100000, 999999).toString();
}

/**
 * Native concurrency limiter to replace 'p-limit' dependency (ESM issues with Jest)
 */
export function pLimit(concurrency: number) {
	const queue: (() => void)[] = [];
	let activeCount = 0;

	const next = () => {
		activeCount--;
		if (queue.length > 0) queue.shift()?.();
	};

	return async <T>(fn: () => Promise<T> | T): Promise<T> => {
		if (activeCount >= concurrency) {
			await new Promise<void>((resolve) => queue.push(resolve));
		}
		activeCount++;
		try {
			return await fn();
		} finally {
			next();
		}
	};
}
