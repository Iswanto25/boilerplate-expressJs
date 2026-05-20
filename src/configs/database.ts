import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "@/utils/logger.js";

let connectionString = process.env.DATABASE_URL || "";
let sslConfig: { rejectUnauthorized: boolean } | undefined = undefined;

if (connectionString.includes("sslmode=")) {
	sslConfig = { rejectUnauthorized: false };
	// Remove sslmode query param so it does not override Node Pool ssl config
	connectionString = connectionString.replace(/([&?])sslmode=[^&]*/, "");
	// Cleanup dangling ? or &
	connectionString = connectionString.replace(/\?&/, "?").replace(/[?&]$/, "");
}

const pool = new Pool({
	connectionString,
	ssl: sslConfig,
});
const adapter = new PrismaPg(pool);

const isDevelopment = process.env.NODE_ENV === "development";

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
