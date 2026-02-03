import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const isDevelopment = process.env.NODE_ENV === "development";

const prisma = new PrismaClient({
	log:
		isDevelopment ?
			[
				{ emit: "event", level: "error" },
				{ emit: "event", level: "warn" },
			]
		:	[
				{ emit: "event", level: "error" },
				{ emit: "event", level: "warn" },
			],
});

// Only log errors and warnings (not every query)
prisma.$on("error", (e) => {
	logger.error(`❌ Database Error: ${e.message}`);
});

prisma.$on("warn", (e) => {
	logger.warn(`⚠️  Database Warning: ${e.message}`);
});

export default prisma;
