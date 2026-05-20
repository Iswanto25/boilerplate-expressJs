import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

/**
 * Generate a secure API Key with HMAC signature
 */
export async function generateApiKey(userKey: string, secretKey: string): Promise<string> {
	const timestamp = Date.now().toString();
	const dataToSign = `${userKey}:${timestamp}`;
	const hmac = crypto.createHmac("sha256", secretKey);
	hmac.update(dataToSign);
	const signature = hmac.digest("hex");
	const payload = `${userKey}:${timestamp}:${signature}`;
	return Buffer.from(payload).toString("base64");
}

/**
 * Middleware to verify API Key and Signature
 */
export function verifyApiKey(req: Request, res: Response, next: NextFunction) {
	const apiKey = req.headers["x-api-key"] as string;

	if (!apiKey) {
		return res.status(401).json({ success: false, message: "API key tidak ditemukan" });
	}

	try {
		const decoded = Buffer.from(apiKey, "base64").toString("utf-8");
		const [userKey, timestamp, signature] = decoded.split(":");

		if (!userKey || !timestamp || !signature) {
			return res.status(401).json({ success: false, message: "Format tidak valid" });
		}

		if (userKey !== process.env.USER_KEY) {
			return res.status(401).json({ success: false, message: "Identitas tidak valid" });
		}

		const requestTime = parseInt(timestamp);
		const currentTime = Date.now();
		const timeDiff = Math.abs(currentTime - requestTime);
		const maxAge = 5 * 60 * 1000; // 5 minutes

		if (timeDiff > maxAge) {
			return res.status(401).json({ success: false, message: "Request expired" });
		}

		const secretKey = process.env.SECRET_KEY;
		if (!secretKey) {
			return res.status(500).json({ success: false, message: "Server configuration error" });
		}

		const dataToVerify = `${userKey}:${timestamp}`;
		const hmac = crypto.createHmac("sha256", secretKey);
		hmac.update(dataToVerify);
		const expectedSignature = hmac.digest("hex");

		if (signature !== expectedSignature) {
			return res.status(401).json({ success: false, message: "Signature tidak valid" });
		}

		next();
	} catch {
		return res.status(401).json({ success: false, message: "Gagal memproses kunci" });
	}
}
