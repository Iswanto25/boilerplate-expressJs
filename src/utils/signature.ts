import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const hashPayload = (body: any): string => {
	const str = typeof body === "string" ? body : JSON.stringify(body || {});
	return crypto.createHash("sha256").update(str).digest("hex");
};

export function generateApiKey(userKey: string, secretKey: string, syncedTimestamp: number): string {
	const timestampStr = syncedTimestamp.toString();
	const data = `${userKey}:${timestampStr}`;
	const signature = crypto.createHmac("sha256", secretKey).update(data).digest("hex");
	const payload = `${userKey}:${timestampStr}:${signature}`;
	return Buffer.from(payload).toString("base64");
}

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
		const maxAge = 5 * 60 * 1000;

		if (timeDiff > maxAge) {
			return res.status(401).json({ success: false, message: "Request expired" });
		}

		const bodyHash = hashPayload(req.body);
		// const dataToVerify = `${userKey}:${timestamp}:${bodyHash}:${req.method}:${req.originalUrl}`;
		const dataToVerify = `${userKey}:${timestamp}`;

		const expectedSignature = crypto.createHmac("sha256", process.env.SECRET_KEY!).update(dataToVerify).digest("hex");

		const isSignatureValid = crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"));

		if (!isSignatureValid) {
			return res.status(401).json({ success: false, message: "Signature tidak valid" });
		}

		next();
	} catch (error) {
		return res.status(401).json({ success: false, message: "Gagal memproses kunci" });
	}
}
