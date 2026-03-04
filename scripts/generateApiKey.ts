#!/usr/bin/env ts-node
/**
 * Script untuk generate API Key dengan signature
 *
 * Usage:
 *   ts-node scripts/generateApiKey.ts
 *
 * atau tambahkan ke package.json:
 *   "generate-api-key": "ts-node scripts/generateApiKey.ts"
 */

import crypto from "node:crypto";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

function generateApiKey(userKey: string, secretKey: string): string {
	const timestamp = Date.now().toString();
	const data = `${userKey}:${timestamp}`;
	const signature = crypto.createHmac("sha256", secretKey).update(data).digest("hex");

	const payload = `${userKey}:${timestamp}:${signature}`;
	return Buffer.from(payload).toString("base64");
}

function main() {
	const userKey = process.env.USER_KEY;
	const secretKey = process.env.SECRET_KEY;

	if (!userKey || !secretKey) {
		console.error("Error: USER_KEY dan SECRET_KEY harus diset di file .env");
		console.error("Tambahkan ke .env:");
		console.error("USER_KEY=your-user-key");
		console.error("SECRET_KEY=your-secret-key");
		process.exit(1);
	}

	const apiKey = generateApiKey(userKey, secretKey);

	console.info("========================================");
	console.info("API Key Generator");
	console.info("========================================");
	console.info(`User Key: ${userKey}`);
	console.info(`API Key: ${apiKey}`);
	console.info("========================================");
	console.info("Cara menggunakan:");
	console.info("Tambahkan header berikut pada request:");
	console.info(`x-api-key: ${apiKey}`);
	console.info("Catatan:");
	console.info("API Key ini valid selama 5 menit");
	console.info("========================================");
}

main();
