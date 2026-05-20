#!/usr/bin/env ts-node
/**
 * Script untuk generate API Key dengan signature
 */

function generateApiKey(userKey: string, secretKey: string): string {
	const timestamp = Date.now().toString();
	const dataToSign = `${userKey}:${timestamp}`;
	const hasher = new Bun.CryptoHasher("sha256", secretKey);
	hasher.update(dataToSign);
	const signature = hasher.digest("hex");
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

	const apiKey = generateApiKey(userKey, secretKey);

	console.info("========================================");
	console.info("API Key Generator");
	console.info("========================================");
	console.info(`User Key: ${userKey}`);
	console.info(`API Key:  ${apiKey}`);
	console.info("========================================");
	console.info("Cara menggunakan:");
	console.info(`curl -H "x-api-key: ${apiKey}" http://localhost:3006/health`);
	console.info("========================================");
}

main();
