import cluster from "node:cluster";
import os from "node:os";
import { app } from "@/configs/express.js";
import http from "http";
import dotenv from "dotenv";
import { logger, closeLogger } from "@/utils/logger.js";
import { checkServicesHealth } from "@/utils/healthCheck.js";
import { redisState } from "@/configs/redis.js";

dotenv.config({ quiet: true });

const PORT = Number(process.env.PORT) || 3006;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

if (cluster.isPrimary) {
	const numCPUs = os.cpus().length;

	for (let i = 0; i < numCPUs; i++) {
		cluster.fork();
	}

	let workersListening = 0;
	let startupReported = false;

	cluster.on("listening", () => {
		workersListening++;
		if (workersListening === numCPUs && !startupReported) {
			startupReported = true;

			const baseUrl = `http://${HOST}:${PORT}`;
			logger.info(
				{ env: NODE_ENV, version: process.env.VERSION || "1.0.0", url: baseUrl, workers: numCPUs },
				"Server started (cluster mode)",
			);

			checkServicesHealth()
				.then(() => {
					logger.info(`✅ Cluster active (${numCPUs} workers)`);
				})
				.catch(() => {
					logger.error("❌ Cluster not active");
				});
		}
	});

	let isShuttingDown = false;

	cluster.on("exit", (worker, code, signal) => {
		if (isShuttingDown) return;
		logger.warn(`Worker ${worker?.process?.pid || "unknown"} died with code ${code} and signal ${signal}. Spawning a new one...`);
		cluster.fork();
	});

	const gracefulShutdownPrimary = (signal: string): void => {
		if (isShuttingDown) return;
		isShuttingDown = true;

		logger.info(`${signal} received, shutting down...`);

		cluster.disconnect(() => {
			redisState.client?.quit();
			setTimeout(() => {
				closeLogger();
				process.exit(0);
			}, 300);
		});
	};

	process.on("SIGTERM", () => gracefulShutdownPrimary("SIGTERM"));
	process.on("SIGINT", () => gracefulShutdownPrimary("SIGINT"));
} else {
	const server = http.createServer(app);

	server.keepAliveTimeout = 65000;
	server.headersTimeout = 66000;

	server.listen(PORT, HOST, () => {
		// Restore worker log level to normal after successful port binding
		logger.level = NODE_ENV === "production" ? "info" : "debug";
	});

	let isWorkerShuttingDown = false;
	const gracefulShutdown = (): void => {
		if (isWorkerShuttingDown) return;
		isWorkerShuttingDown = true;

		server.close(() => {
			redisState.client?.quit();
			closeLogger();
			process.exit(0);
		});
	};

	process.on("SIGTERM", gracefulShutdown);
	process.on("SIGINT", gracefulShutdown);
}

