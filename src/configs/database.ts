import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { logger } from "../utils/logger.js";
import dotenv from "dotenv";

dotenv.config();

const isDevelopment = process.env.NODE_ENV === "development";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
	adapter,
	log:
		isDevelopment ?
			[
				{ emit: "event", level: "query" },
				{ emit: "event", level: "error" },
				{ emit: "event", level: "warn" },
			]
		:	[
				{ emit: "event", level: "error" },
				{ emit: "event", level: "warn" },
			],
});

// Only log errors and warnings (not every query)
prisma.$on("error", (e: any) => {
	logger.error(`Database Error: ${e.message}`);
});

prisma.$on("warn", (e: any) => {
	logger.warn(`Database Warning: ${e.message}`);
});

if (isDevelopment) {
	prisma.$on("query", (e: any) => {
		logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
	});
}

export default prisma;
