import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";

dotenv.config({ quiet: process.env.NODE_ENV === "production" });

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
	},
	datasource: {
		url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
	},
});
