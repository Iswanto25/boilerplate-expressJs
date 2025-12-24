import { Request, Response, NextFunction } from "express";
import { redisClient, isRedisAvailable } from "../configs/redis";
import { HttpStatus, respons } from "./respons";
import { logger } from "./logger";

interface RateLimitOptions {
	keyPrefix?: string;
	windowInSeconds?: number;
	maxRequests?: number;
	blockDuration?: number;
	useUserId?: boolean;
}

export function rateLimiter(options?: RateLimitOptions) {
	const { keyPrefix = "rate_limit:", windowInSeconds = 60, maxRequests = 30, blockDuration = 60, useUserId = true } = options || {};

	return async function rateLimiter(req: Request, res: Response, next: NextFunction) {
		if (!isRedisAvailable || !redisClient) {
			logger.warn("⚠️  Rate limiting skipped - Redis not available");
			return next();
		}

		try {
			const userId = useUserId && req.user?.id ? req.user.id : null;
			const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.socket.remoteAddress || "unknown";

			const keyId = userId || ip;
			const key = `${keyPrefix}${keyId}`;

			const current = await redisClient.incr(key);
			if (current === 1) {
				await redisClient.expire(key, windowInSeconds);
			}

			if (current > maxRequests) {
				const ttl = await redisClient.ttl(key);

				await redisClient.set(`${keyPrefix}blocked:${keyId}`, "1", "EX", blockDuration);
				logger.warn(`Rate limit exceeded for ${userId ? `user ${userId}` : ip}`);

				return respons.error(
					"Terlalu banyak permintaan",
					`Terlalu banyak permintaan. Coba lagi dalam ${ttl} detik.`,
					HttpStatus.TOO_MANY_REQUESTS,
					res,
					req,
				);
			}

			next();
		} catch (error) {
			logger.warn({ error }, "⚠️  Rate limitter error - skipping rate limit");
			next();
		}
	};
}
