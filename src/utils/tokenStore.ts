import { redisClient, isRedisAvailable } from "../configs/redis";
import { logger } from "./logger";

const ACCESS_TOKEN_PREFIX = "access_token:";
const REFRESH_TOKEN_PREFIX = "refresh_token:";

export async function storeToken(userId: string, token: string, type: "access" | "refresh", expiresInSeconds: number) {
	if (!isRedisAvailable || !redisClient) {
		logger.warn("⚠️  Token storage skipped - Redis not available");
		return null;
	}

	try {
		const prefix = type === "access" ? ACCESS_TOKEN_PREFIX : REFRESH_TOKEN_PREFIX;
		const key = `${prefix}${userId}`;
		const result = await redisClient.set(key, token, "EX", expiresInSeconds);
		if (result !== "OK") throw new Error("Failed to store token");
		return key;
	} catch (error) {
		logger.warn({ error }, "⚠️  Failed to store token in Redis");
		return null;
	}
}

export async function getStoredToken(userId: string, type: "access" | "refresh") {
	if (!isRedisAvailable || !redisClient) {
		logger.warn("⚠️  Token retrieval skipped - Redis not available");
		return null;
	}

	try {
		const prefix = type === "access" ? ACCESS_TOKEN_PREFIX : REFRESH_TOKEN_PREFIX;
		return await redisClient.get(`${prefix}${userId}`);
	} catch (error) {
		logger.warn({ error }, "⚠️  Failed to get token from Redis");
		return null;
	}
}

export async function deleteToken(userId: string, type: "access" | "refresh") {
	if (!isRedisAvailable || !redisClient) {
		logger.warn("⚠️  Token deletion skipped - Redis not available");
		return;
	}

	try {
		const prefix = type === "access" ? ACCESS_TOKEN_PREFIX : REFRESH_TOKEN_PREFIX;
		await redisClient.del(`${prefix}${userId}`);
	} catch (error) {
		logger.warn({ error }, "⚠️  Failed to delete token from Redis");
	}
}
