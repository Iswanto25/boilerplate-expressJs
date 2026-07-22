import { app } from "@/configs/express.js";
import http from "http";
import dotenv from "dotenv";
import { logger, closeLogger } from "@/utils/logger.js";
import { checkServicesHealth } from "@/utils/healthCheck.js";
import { redisState } from "@/configs/redis.js";

dotenv.config({ quiet: process.env.NODE_ENV === "production" });

const PORT = Number(process.env.PORT) || 3006;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

const server = http.createServer(app);

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.listen(PORT, HOST, () => {
	const baseUrl = isProd ? process.env.BASE_URL || `https://${process.env.DOMAIN || "yourdomain.com"}` : `http://${HOST}:${PORT}`;

	logger.info({ env: NODE_ENV, version: process.env.VERSION || "1.0.0", url: baseUrl }, "Server started");

	checkServicesHealth().catch((err) => {
		logger.error({ err }, "Unexpected error during health check");
	});
});

function gracefulShutdown(): void {
	logger.info("SIGTERM signal received: shutting down gracefully");

	server.close(() => {
		logger.info("HTTP server closed");

		redisState.client?.quit();
		closeLogger();

		process.exit(0);
	});
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
