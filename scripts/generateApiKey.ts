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

import crypto from "crypto";
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
		console.error("❌ Error: USER_KEY dan SECRET_KEY harus diset di file .env");
		console.error("\nTambahkan ke .env:");
		console.error("USER_KEY=your-user-key");
		console.error("SECRET_KEY=your-secret-key");
		process.exit(1);
	}

	const apiKey = generateApiKey(userKey, secretKey);

	console.log("\n========================================");
	console.log("🔑 API Key Generator");
	console.log("========================================");
	console.log(`User Key: ${userKey}`);
	console.log(`API Key: ${apiKey}`);
	console.log("========================================");
	console.log("\n📝 Cara menggunakan:");
	console.log("Tambahkan header berikut pada request:");
	console.log(`x-api-key: ${apiKey}`);
	console.log("\n⏰ Catatan:");
	console.log("API Key ini valid selama 5 menit");
	console.log("========================================\n");
}

main();
