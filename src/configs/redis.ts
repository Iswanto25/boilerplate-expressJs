import Redis from "ioredis";
import { logger } from "../utils/logger";

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// Check if Redis configuration is available
const hasRedisConfig = !!(process.env.REDIS_HOST || process.env.REDIS_PORT);

if (hasRedisConfig) {
	try {
		redisClient = new Redis({
			host: process.env.REDIS_HOST || "127.0.0.1",
			port: Number(process.env.REDIS_PORT) || 6379,
			password: process.env.REDIS_PASSWORD || undefined,
			db: Number(process.env.REDIS_DB) || 0,
			connectTimeout: 10_000,
			retryStrategy: (times) => {
				if (times > 3) {
					logger.warn("⚠️  Redis connection failed after 3 retries. Running without Redis.");
					isRedisAvailable = false;
					return null; // Stop retrying
				}
				return Math.min(times * 200, 2000);
			},
			maxRetriesPerRequest: 5,
			lazyConnect: true, // Don't connect immediately
		});

		redisClient.on("connect", () => {
			isRedisAvailable = true;
			logger.info("✅ Redis connected");
		});

		redisClient.on("ready", () => {
			isRedisAvailable = true;
			logger.info("✅ Redis ready for commands");
		});

		redisClient.on("error", (err) => {
			isRedisAvailable = false;
			logger.warn({ err }, "⚠️  Redis connection error - running without Redis");
		});

		redisClient.on("reconnecting", () => {
			logger.warn("⚠️  Redis reconnecting...");
		});

		// Try to connect
		redisClient.connect().catch((err) => {
			isRedisAvailable = false;
			logger.warn("⚠️  Redis not available - running without Redis cache");
		});
	} catch (error) {
		isRedisAvailable = false;
		logger.warn("⚠️  Redis initialization failed - running without Redis");
	}
} else {
	logger.warn("⚠️  Redis configuration not found (REDIS_HOST/REDIS_PORT) - running without Redis");
}

export { redisClient, isRedisAvailable };
