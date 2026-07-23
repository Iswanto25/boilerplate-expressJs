import { app } from "@/configs/express.js";
import http from "http";
import { logger, closeLogger } from "@/utils/logger.js";
import { checkServicesHealth } from "@/utils/healthCheck.js";
import { redisState } from "@/configs/redis.js";

import "@/features/auth/jobs/auth.jobs.js";

const PORT = Number(process.env.PORT) || 3006;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

const server = http.createServer(app);

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.listen(PORT, HOST, () => {
	const baseUrl = `http://${HOST}:${PORT}`;

	logger.info({ env: NODE_ENV, version: process.env.VERSION || "1.0.0", url: baseUrl }, "Server started (dev mode - workers active)");

	checkServicesHealth().catch((err) => {
		logger.error({ err }, "Unexpected error during health check");
	});
});

let isShuttingDown = false;

process.on("SIGTERM", async () => {
	if (isShuttingDown) return;
	isShuttingDown = true;
	logger.info("SIGTERM received, shutting down...");

	const { authWorker } = await import("@/features/auth/jobs/auth.jobs.js");
	if (authWorker) {
		await authWorker.close();
		logger.info("BullMQ worker closed");
	}

	server.close(() => {
		redisState.client?.quit();
		closeLogger();
		logger.info("Shutdown complete");
		process.exit(0);
	});
});

process.on("SIGINT", async () => {
	if (isShuttingDown) return;
	isShuttingDown = true;
	logger.info("SIGINT received, shutting down...");

	const { authWorker } = await import("@/features/auth/jobs/auth.jobs.js");
	if (authWorker) {
		await authWorker.close();
	}

	server.close(() => {
		redisState.client?.quit();
		closeLogger();
		process.exit(0);
	});
});
