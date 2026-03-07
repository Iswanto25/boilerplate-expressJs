import { Redis } from "ioredis";
import { logger } from "../utils/logger.js";

const redisState: { client: Redis | null; isAvailable: boolean } = {
	client: null,
	isAvailable: false,
};

const hasRedisConfig = !!(process.env.REDIS_HOST || process.env.REDIS_PORT);

if (hasRedisConfig) {
	try {
		redisState.client = new Redis({
			host: process.env.REDIS_HOST || "127.0.0.1",
			port: Number(process.env.REDIS_PORT) || 6379,
			password: process.env.REDIS_PASSWORD || undefined,
			db: Number(process.env.REDIS_DB) || 0,
			connectTimeout: 10_000,
			retryStrategy: (times: number) => {
				if (times > 3) {
					logger.warn("Redis connection failed after 3 retries. Running without Redis.");
					redisState.isAvailable = false;
					return null;
				}
				return Math.min(times * 200, 2000);
			},
			maxRetriesPerRequest: 5,
			lazyConnect: true,
		});

		redisState.client.on("connect", () => {
			redisState.isAvailable = true;
			logger.info("Redis connected");
		});

		redisState.client.on("ready", () => {
			redisState.isAvailable = true;
			logger.info("Redis ready for commands");
		});

		redisState.client.on("error", (err: Error) => {
			redisState.isAvailable = false;
			logger.warn({ err }, "Redis connection error - running without Redis");
		});

		redisState.client.on("reconnecting", () => {
			logger.warn("Redis reconnecting...");
		});

		redisState.client.connect().catch(() => {
			redisState.isAvailable = false;
			logger.warn("Redis not available - running without Redis cache");
		});
	} catch {
		redisState.isAvailable = false;
		logger.warn("Redis initialization failed - running without Redis");
	}
} else {
	logger.warn("Redis configuration not found (REDIS_HOST/REDIS_PORT) - running without Redis");
}

export { redisState };
