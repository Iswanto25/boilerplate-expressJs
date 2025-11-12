import crypto from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const DEFAULT_VERSION = 1;

const DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY;
let cachedKey: Buffer | null = null;

const loadKey = (): Buffer => {
	if (cachedKey) return cachedKey;

	const keySource = DATA_ENCRYPTION_KEY;
	if (!keySource) throw new Error("DATA_ENCRYPTION_KEY is required for encryption");

	let keyBuffer: Buffer;
	if (/^[0-9a-fA-F]{64}$/.test(keySource)) {
		keyBuffer = Buffer.from(keySource, "hex");
	} else {
		keyBuffer = Buffer.from(keySource, "base64");
	}

	if (keyBuffer.length !== 32) {
		throw new Error("DATA_ENCRYPTION_KEY must represent 32 bytes (256 bits)");
	}

	cachedKey = keyBuffer;
	return cachedKey;
};

export interface EncryptOptions<T = string> {
	serialize?: (value: T) => string;
}

export interface DecryptOptions<T = string> {
	deserialize?: (value: string) => T;
}

export interface EncryptionPayload {
	version: number;
	ciphertext: string;
}

export function encryptSensitive<T = string>(value: T, options?: EncryptOptions<T>): EncryptionPayload {
	const key = loadKey();
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

	const toEncrypt = options?.serialize ? options.serialize(value) : String(value);
	const ciphertext = Buffer.concat([cipher.update(toEncrypt, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();
	const payload = Buffer.concat([iv, authTag, ciphertext]).toString("base64");

	return {
		version: DEFAULT_VERSION,
		ciphertext: payload,
	};
}

export function decryptSensitive<T = string>(payload: EncryptionPayload, options?: DecryptOptions<T>): T {
	if (payload.version !== DEFAULT_VERSION) {
		throw new Error(`Unsupported encryption payload version: ${payload.version}`);
	}

	const key = loadKey();
	const raw = Buffer.from(payload.ciphertext, "base64");

	const iv = raw.subarray(0, IV_LENGTH);
	const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
	const encrypted = raw.subarray(IV_LENGTH + 16);

	const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
	return options?.deserialize ? options.deserialize(decrypted) : (decrypted as unknown as T);
}

export const encryptionUtils = {
	encryptSensitive,
	decryptSensitive,
};
