import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient({
	log: [
		{ emit: "event", level: "query" },
		{ emit: "event", level: "error" },
		{ emit: "event", level: "info" },
		{ emit: "event", level: "warn" },
	],
});

prisma.$on("query", (e) => {
	logger.info(`QUERY: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
});

prisma.$on("error", (e) => {
	logger.error(`DB ERROR: ${e.message}`);
});

prisma.$on("warn", (e) => {
	logger.warn(`DB WARN: ${e.message}`);
});

export default prisma;
