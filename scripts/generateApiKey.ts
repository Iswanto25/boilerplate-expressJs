#!/usr/bin/env ts-node

import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

function generateApiKey(userKey: string, secretKey: string): string {
	const isProd = process.env.NODE_ENV === "production";

	if (!isProd) {
		const payload = `${userKey}:${secretKey}`;
		return Buffer.from(payload).toString("base64");
	}

	const timestamp = Date.now().toString();
	const dataToSign = `${userKey}:${timestamp}`;
	const signature = crypto.createHmac("sha256", secretKey).update(dataToSign).digest("hex");
	const payload = `${userKey}:${timestamp}:${signature}`;
	return Buffer.from(payload).toString("base64");
}

function main() {
	const userKey = process.env.USER_KEY;
	const secretKey = process.env.SECRET_KEY;
	const env = process.env.NODE_ENV || "development";

	if (!userKey || !secretKey) {
		console.error("Error: USER_KEY dan SECRET_KEY harus diset di file .env");
		process.exit(1);
	}

	const apiKey = generateApiKey(userKey, secretKey);

	console.info("========================================");
	console.info(`API Key Generator (${env})`);
	console.info("========================================");
	console.info(`User Key: ${userKey}`);
	console.info(`API Key:  ${apiKey}`);
	console.info("========================================");
	console.info("Cara menggunakan:");
	console.info(`curl -H "x-api-key: ${apiKey}" http://localhost:3006/health`);
	console.info("========================================");
}

main();
