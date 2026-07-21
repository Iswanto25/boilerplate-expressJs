import { redisState } from "@/configs/redis.js";
import { logger } from "@/utils/logger.js";

const ACCESS_TOKEN_PREFIX = "access_token:";
const REFRESH_TOKEN_PREFIX = "refresh_token:";
const OTP_PREFIX = "otp:";

export async function storeToken(userId: string, token: string, type: "access" | "refresh" | "otp", expiresInSeconds: number) {
	if (!redisState.isAvailable || !redisState.client) {
		logger.warn("Token storage skipped - Redis not available");
		return null;
	}

	try {
		const key = `${getPrefix(type)}${userId}`;
		const result = await redisState.client.set(key, token, "EX", expiresInSeconds);
		if (result !== "OK") throw new Error("Failed to store token");
		return key;
	} catch (error) {
		logger.warn({ error }, "Failed to store token in Redis");
		return null;
	}
}

function getPrefix(type: "access" | "refresh" | "otp") {
	return type === "access" ? ACCESS_TOKEN_PREFIX : type === "otp" ? OTP_PREFIX : REFRESH_TOKEN_PREFIX;
}

export async function getStoredToken(userId: string, type: "access" | "refresh" | "otp") {
	if (!redisState.isAvailable || !redisState.client) {
		logger.warn("Token retrieval skipped - Redis not available");
		return null;
	}

	try {
		return await redisState.client.get(`${getPrefix(type)}${userId}`);
	} catch (error) {
		logger.warn({ error }, "Failed to get token from Redis");
		return null;
	}
}

export async function deleteToken(userId: string, type: "access" | "refresh" | "otp") {
	if (!redisState.isAvailable || !redisState.client) {
		logger.warn("Token deletion skipped - Redis not available");
		return;
	}

	try {
		await redisState.client.del(`${getPrefix(type)}${userId}`);
	} catch (error) {
		logger.warn({ error }, "Failed to delete token from Redis");
	}
}
