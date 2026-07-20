import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { logger } from "@/utils/logger.js";

dotenv.config({ quiet: process.env.NODE_ENV === "production" });

let connectionString = process.env.DATABASE_URL || "";
let sslConfig: { rejectUnauthorized: boolean } | undefined = undefined;

const sslMode = connectionString.match(/[&?]sslmode=([^&]*)/)?.[1];
if (sslMode) {
	if (sslMode !== "disable") {
		sslConfig = { rejectUnauthorized: sslMode === "verify-full" };
	}
	connectionString = connectionString.replace(/([&?])sslmode=[^&]*/, "");
	connectionString = connectionString.replace(/\?&/, "?").replace(/[?&]$/, "");
}

const pool = new Pool({
	connectionString,
	ssl: sslConfig,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
	adapter,
	log: [
		{ emit: "event", level: "error" },
		{ emit: "event", level: "warn" },
	],
});

prisma.$on("error", (e) => {
	logger.error(`Database Error: ${e.message}`);
});

prisma.$on("warn", (e) => {
	logger.warn(`Database Warning: ${e.message}`);
});

export default prisma;
