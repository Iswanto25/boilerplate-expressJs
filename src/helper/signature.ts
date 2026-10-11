import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { HttpStatus, respons } from "./respons.js";

const UTC7_OFFSET_MS = 7 * 60 * 60 * 1000;

function utc7Now(): number {
	return Date.now() + UTC7_OFFSET_MS;
}

export async function generateApiKey(userKey: string, secretKey: string): Promise<string> {
	const isProd = process.env.NODE_ENV === "production";
	const timestamp = utc7Now().toString();

	if (!isProd) {
		const payload = `${userKey}:${secretKey}`;
		return Buffer.from(payload).toString("base64");
	}

	const dataToSign = `${userKey}:${timestamp}`;
	const hmac = crypto.createHmac("sha256", secretKey);
	hmac.update(dataToSign);
	const signature = hmac.digest("hex");
	const payload = `${userKey}:${timestamp}:${signature}`;
	return Buffer.from(payload).toString("base64");
}

export function verifyApiKey(req: Request, res: Response, next: NextFunction) {
	const apiKey = req.headers["x-api-key"] as string | undefined;

	if (!apiKey) {
		return respons.error("API key tidak ditemukan", "Unauthorized", HttpStatus.UNAUTHORIZED, res, req);
	}

	try {
		const decoded = Buffer.from(apiKey, "base64").toString("utf-8");
		const isProd = process.env.NODE_ENV === "production";

		if (!isProd) {
			const [userKey, secretKey] = decoded.split(":");

			if (userKey !== process.env.USER_KEY || secretKey !== process.env.SECRET_KEY) {
				return respons.error("Identitas atau Secret Key tidak valid", "Unauthorized", HttpStatus.UNAUTHORIZED, res, req);
			}
			return next();
		}

		const [userKey, timestamp, signature] = decoded.split(":");

		if (!userKey || !timestamp || !signature) {
			return respons.error("Format API Key tidak valid", "Unauthorized", HttpStatus.UNAUTHORIZED, res, req);
		}

		if (userKey !== process.env.USER_KEY) {
			return respons.error("Identitas API Key tidak valid", "Unauthorized", HttpStatus.UNAUTHORIZED, res, req);
		}

		const requestTime = parseInt(timestamp, 10);
		const currentTime = utc7Now();
		const timeDiff = Math.abs(currentTime - requestTime);
		const maxAge = 5 * 60 * 1000;

		if (timeDiff > maxAge) {
			return respons.error("Request expired", "Unauthorized", HttpStatus.UNAUTHORIZED, res, req);
		}

		const secretKey = process.env.SECRET_KEY;
		if (!secretKey) {
			return respons.error("Server configuration error", "Internal Server Error", HttpStatus.INTERNAL_SERVER_ERROR, res, req);
		}

		const dataToVerify = `${userKey}:${timestamp}`;
		const hmac = crypto.createHmac("sha256", secretKey);
		hmac.update(dataToVerify);
		const expectedSignature = hmac.digest("hex");

		const isSignatureValid =
			signature.length === expectedSignature.length &&
			crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"));

		if (!isSignatureValid) {
			return respons.error("Signature API Key tidak valid", "Unauthorized", HttpStatus.UNAUTHORIZED, res, req);
		}

		return next();
	} catch {
		return respons.error("Gagal memproses API Key", "Unauthorized", HttpStatus.UNAUTHORIZED, res, req);
	}
}
