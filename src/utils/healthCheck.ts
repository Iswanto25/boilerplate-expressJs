import prisma from "../configs/database.js";
import { redisState } from "../configs/redis.js";
import { isS3Configured } from "./s3.js";
import { isSMTPConfigured } from "./smtp.js";
import { logger } from "./logger.js";

export async function checkServicesHealth() {
	logger.info("========================================");
	logger.info("🔍 SERVICE HEALTH REPORT");
	logger.info("========================================");

	// 1. Database (Prisma)
	try {
		await prisma.$queryRaw`SELECT 1`;
		logger.info("✅ Database: Connected (Prisma)");
	} catch (error) {
		logger.error({ err: error }, "❌ Database: Connection failed");
	}

	// 2. Redis
	if (redisState.isAvailable) {
		logger.info("✅ Redis: Connected and ready");
	} else {
		logger.warn("⚠️  Redis: Not available (Running without cache)");
	}

	// 3. S3/MinIO
	if (isS3Configured) {
		logger.info("✅ S3/MinIO: Configured");
	} else {
		logger.warn("⚠️  S3/MinIO: Not configured (File uploads disabled)");
	}

	// 4. SMTP
	if (isSMTPConfigured) {
		logger.info("✅ SMTP: Configured");
	} else {
		logger.warn("⚠️  SMTP: Not configured (Email sending disabled)");
	}

	logger.info("========================================");
}
