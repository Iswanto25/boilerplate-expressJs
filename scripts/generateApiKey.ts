#!/usr/bin/env ts-node
/**
 * Script untuk generate API Key dengan signature
 */

import crypto from "node:crypto";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const hashPayload = (body: unknown): string => {
	const str = typeof body === "string" ? body : JSON.stringify(body || {});
	return crypto.createHash("sha256").update(str).digest("hex");
};

function generateApiKey(userKey: string, secretKey: string, method: string, url: string, body: unknown): string {
	const timestamp = Date.now().toString();
	const bodyHash = hashPayload(body);
	const dataToSign = `${userKey}:${timestamp}:${bodyHash}:${method.toUpperCase()}:${url}`;
	const signature = crypto.createHmac("sha256", secretKey).update(dataToSign).digest("hex");

	const payload = `${userKey}:${timestamp}:${signature}`;
	return Buffer.from(payload).toString("base64");
}

function main() {
	const userKey = process.env.USER_KEY;
	const secretKey = process.env.SECRET_KEY;

	if (!userKey || !secretKey) {
		console.error("Error: USER_KEY dan SECRET_KEY harus diset di file .env");
		process.exit(1);
	}

	// Ambil argumen dari command line jika ada
	const method = process.argv[2] || "GET";
	const url = process.argv[3] || "/health";
	const body = process.argv[4] ? JSON.parse(process.argv[4]) : {};

	const apiKey = generateApiKey(userKey, secretKey, method, url, body);

	console.info("========================================");
	console.info("API Key Generator (Updated)");
	console.info("========================================");
	console.info(`User Key: ${userKey}`);
	console.info(`Method:   ${method}`);
	console.info(`URL:      ${url}`);
	console.info(`Body:     ${JSON.stringify(body)}`);
	console.info("----------------------------------------");
	console.info(`API Key:  ${apiKey}`);
	console.info("========================================");
	console.info("Cara menggunakan:");
	console.info(`curl -X ${method} http://localhost:3006${url} \\`);
	console.info(`  -H "x-api-key: ${apiKey}" \\`);
	if (method !== "GET") console.info(`  -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`);
	console.info("========================================");
}

main();
