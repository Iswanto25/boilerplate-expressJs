import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

/**
 * Hash request body consistently
 */
const hashPayload = (body: unknown): string => {
	const str = typeof body === "string" ? body : JSON.stringify(body || {});
	return crypto.createHash("sha256").update(str).digest("hex");
};

/**
 * Generate a secure API Key with HMAC signature
 * Includes method, url, and body hash to prevent replay and tampering
 */
export function generateApiKey(
	userKey: string,
	secretKey: string,
	syncedTimestamp: number,
	method: string,
	url: string,
	body: unknown,
): string {
	const timestampStr = syncedTimestamp.toString();
	const bodyHash = hashPayload(body);
	const dataToSign = `${userKey}:${timestampStr}:${bodyHash}:${method.toUpperCase()}:${url}`;
	const signature = crypto.createHmac("sha256", secretKey).update(dataToSign).digest("hex");
	const payload = `${userKey}:${timestampStr}:${signature}`;
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

		// In production, USER_KEY and SECRET_KEY should be retrieved based on the userKey (e.g. from DB)
		// For this boilerplate, we use environment variables
		if (userKey !== process.env.USER_KEY) {
			return res.status(401).json({ success: false, message: "Identitas tidak valid" });
		}

		// 1. Check timestamp (prevent replay attacks)
		const requestTime = parseInt(timestamp);
		const currentTime = Date.now();
		const timeDiff = Math.abs(currentTime - requestTime);
		const maxAge = 5 * 60 * 1000; // 5 minutes

		if (timeDiff > maxAge) {
			return res.status(401).json({ success: false, message: "Request expired" });
		}

		// 2. Verify signature
		const bodyHash = hashPayload(req.body);
		const dataToVerify = `${userKey}:${timestamp}:${bodyHash}:${req.method.toUpperCase()}:${req.originalUrl}`;

		const secretKey = process.env.SECRET_KEY;
		if (!secretKey) {
			return res.status(500).json({ success: false, message: "Server configuration error" });
		}

		const expectedSignature = crypto.createHmac("sha256", secretKey).update(dataToVerify).digest("hex");

		const isSignatureValid = crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"));

		if (!isSignatureValid) {
			return res.status(401).json({ success: false, message: "Signature tidak valid" });
		}

		next();
	} catch (error) {
		return res.status(401).json({ success: false, message: "Gagal memproses kunci" });
	}
}
