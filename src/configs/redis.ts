import Redis from "ioredis";
import { logger } from "../utils/logger";

export const redisClient = new Redis({
	host: process.env.REDIS_HOST || "127.0.0.1",
	port: Number(process.env.REDIS_PORT) || 6379,
	password: process.env.REDIS_PASSWORD || undefined,
	db: Number(process.env.REDIS_DB) || 0,
	connectTimeout: 10_000,
	retryStrategy: (times) => Math.min(times * 200, 2000),
	maxRetriesPerRequest: 5,
});

redisClient.on("connect", () => {
	logger.info("Redis connected");
});

redisClient.on("ready", () => {
	logger.info("Redis ready for commands");
});

redisClient.on("error", (err) => {
	logger.error({ err }, "Redis connection error");
});

redisClient.on("reconnecting", () => {
	logger.warn("Redis reconnecting...");
});
