#!/usr/bin/env ts-node

import crypto from "node:crypto";

const EPOCH = Math.floor(Date.now() / 1000);
const jwtSecret = "rahasia";
const jwtRefreshSecret = "rahasia";
const dataEncryptionKey = "rahasia";
const saltHash = "rahasia";
const userKey = "rahasia";
const secretKey = "rahasia";

console.log("========================================");
console.log("  ENV SECRET GENERATOR");
console.log(`  Epoch (seconds since 1970-01-01): ${EPOCH}`);
console.log(`  Date: ${new Date().toISOString()}`);
console.log("========================================\n");

const jwtPlaintext = `${jwtSecret}-${EPOCH}`;
const JWT_SECRET = crypto.createHash("sha256").update(jwtPlaintext).digest("hex");

console.log("# ── JWT Secret (jose HS256) ──");
console.log(`# Plaintext: ${jwtPlaintext}`);
console.log(`JWT_SECRET=${JWT_SECRET}`);
console.log();

const refreshPlaintext = `${jwtRefreshSecret}-${EPOCH}`;
const JWT_REFRESH_SECRET = crypto.createHash("sha256").update(refreshPlaintext).digest("hex");

console.log("# ── JWT Refresh Secret ──");
console.log(`# Plaintext: ${refreshPlaintext}`);
console.log(`JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}`);
console.log();

const encryptionPlaintext = `${dataEncryptionKey}-${EPOCH}`;
const DATA_ENCRYPTION_KEY = crypto.createHash("sha256").update(encryptionPlaintext).digest("hex");

console.log("# ── Encryption Key (AES-256-GCM, 64 char hex) ──");
console.log(`# Plaintext: ${encryptionPlaintext}`);
console.log(`DATA_ENCRYPTION_KEY=${DATA_ENCRYPTION_KEY}`);
console.log();

const saltPlaintext = `${saltHash}-${EPOCH}`;
const SALT_HASH = crypto.createHash("sha256").update(saltPlaintext).digest("base64");

console.log("# ── Salt Hash (bcrypt salt tambahan) ──");
console.log(`# Plaintext: ${saltPlaintext}`);
console.log(`SALT_HASH=${SALT_HASH}`);
console.log();

const userKeyPlaintext = `${userKey}-${EPOCH}`;
const USER_KEY = crypto.createHash("sha256").update(userKeyPlaintext).digest("base64url");

console.log("# ── API Key (HMAC-SHA256) ──");
console.log(`# Plaintext: ${userKeyPlaintext}`);
console.log(`USER_KEY=${USER_KEY}`);
console.log();

const secretKeyPlaintext = `${secretKey}-${EPOCH}`;
const SECRET_KEY = crypto.createHash("sha256").update(secretKeyPlaintext).digest("base64url");

console.log("# ── API Secret (HMAC-SHA256) ──");
console.log(`# Plaintext: ${secretKeyPlaintext}`);
console.log(`SECRET_KEY=${SECRET_KEY}`);
console.log();

console.log("========================================");
console.log("  Copy values di atas ke .env");
console.log("========================================");
