import { redisClient } from "../configs/redis";

const ACCESS_TOKEN_PREFIX = "access_token:";
const REFRESH_TOKEN_PREFIX = "refresh_token:";

export async function storeToken(userId: string, token: string, type: "access" | "refresh", expiresInSeconds: number) {
	const prefix = type === "access" ? ACCESS_TOKEN_PREFIX : REFRESH_TOKEN_PREFIX;
	const key = `${prefix}${userId}`;
	const result = await redisClient.set(key, token, "EX", expiresInSeconds);
	if (result !== "OK") throw new Error("Failed to store token");
	return key;
}

export async function getStoredToken(userId: string, type: "access" | "refresh") {
	const prefix = type === "access" ? ACCESS_TOKEN_PREFIX : REFRESH_TOKEN_PREFIX;
	const result = await redisClient.get(`${prefix}${userId}`);
	if (!result) return null;
	return redisClient.get(`${prefix}${userId}`);
}

export async function deleteToken(userId: string, type: "access" | "refresh") {
	const prefix = type === "access" ? ACCESS_TOKEN_PREFIX : REFRESH_TOKEN_PREFIX;
	const result = await redisClient.del(`${prefix}${userId}`);
	if (result === 0) return null;
	return redisClient.del(`${prefix}${userId}`);
}
