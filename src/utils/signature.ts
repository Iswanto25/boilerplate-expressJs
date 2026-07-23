import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

export function generateApiKey(userKey: string, secretKey: string, method: string, url: string): string {
	const dataToSign = `${userKey}:${method.toUpperCase()}:${url}`;
	const signature = crypto.createHmac("sha256", secretKey).update(dataToSign).digest("hex");
	const payload = `${userKey}:${signature}`;
	return Buffer.from(payload).toString("base64");
}

export function verifyApiKey(req: Request, res: Response, next: NextFunction) {
	const apiKey = req.headers["x-api-key"] as string;

	if (!apiKey) {
		return res.status(401).json({ success: false, message: "API key tidak ditemukan" });
	}

	try {
		const decoded = Buffer.from(apiKey, "base64").toString("utf-8");
		const [userKey, signature] = decoded.split(":");

		if (!userKey || !signature) {
			return res.status(401).json({ success: false, message: "Format tidak valid" });
		}

		if (userKey !== process.env.USER_KEY) {
			return res.status(401).json({ success: false, message: "Identitas tidak valid" });
		}

		const dataToVerify = `${userKey}:${req.method.toUpperCase()}:${req.originalUrl}`;

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
	} catch {
		return res.status(401).json({ success: false, message: "Gagal memproses kunci" });
	}
}
