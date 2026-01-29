import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function generateApiKey(userKey: string, secretKey: string): string {
	const timestamp = Date.now().toString();
	const data = `${userKey}:${timestamp}`;
	const signature = crypto.createHmac("sha256", secretKey).update(data).digest("hex");

	const payload = `${userKey}:${timestamp}:${signature}`;
	return Buffer.from(payload).toString("base64");
}

export function verifyApiKey(req: Request, res: Response, next: NextFunction) {
	const apiKey = req.headers["x-api-key"] as string;

	if (!apiKey) {
		return res.status(401).json({
			success: false,
			message: "API key tidak ditemukan",
		});
	}

	try {
		const decoded = Buffer.from(apiKey, "base64").toString("utf-8");
		const [userKey, timestamp, signature] = decoded.split(":");

		if (!userKey || !timestamp || !signature) {
			return res.status(401).json({
				success: false,
				message: "Format API key tidak valid",
			});
		}

		if (userKey !== process.env.USER_KEY) {
			return res.status(401).json({
				success: false,
				message: "API key tidak valid",
			});
		}

		const requestTime = parseInt(timestamp);
		const currentTime = Date.now();
		const timeDiff = currentTime - requestTime;
		const maxAge = 5 * 60 * 1000;

		if (timeDiff > maxAge || timeDiff < 0) {
			return res.status(401).json({
				success: false,
				message: "API key sudah expired atau tidak valid",
			});
		}

		const data = `${userKey}:${timestamp}`;
		const expectedSignature = crypto.createHmac("sha256", process.env.SECRET_KEY!).update(data).digest("hex");

		if (signature !== expectedSignature) {
			return res.status(401).json({
				success: false,
				message: "Signature API key tidak valid",
			});
		}

		next();
	} catch (error) {
		return res.status(401).json({
			success: false,
			message: "API key tidak valid",
		});
	}
}
