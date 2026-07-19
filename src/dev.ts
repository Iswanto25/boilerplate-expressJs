import { app } from "@/configs/express.js";
import http from "http";
import { logger } from "@/utils/logger.js";
import { checkServicesHealth } from "@/utils/healthCheck.js";

import "@/features/auth/jobs/auth.jobs.js";

const PORT = Number(process.env.PORT) || 3006;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

const server = http.createServer(app);

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.listen(PORT, HOST, () => {
	const baseUrl = `http://${HOST}:${PORT}`;

	console.info("========================================");
	console.info(`Server is running`);
	console.info(`Version: ${process.env.VERSION || "1.0.0"}`);
	console.info(`Environment: ${NODE_ENV}`);
	console.info(`URL: ${baseUrl}`);
	console.info("Worker: Running (BullMQ background jobs)");
	console.info("========================================");

	checkServicesHealth().catch((err) => {
		logger.error({ err }, "Unexpected error during health check");
	});
});

process.on("SIGTERM", async () => {
	console.info("SIGTERM received, shutting down...");

	const { authWorker } = await import("@/features/auth/jobs/auth.jobs.js");
	await authWorker.close();

	server.close(() => {
		console.info("Server & worker closed gracefully");
		process.exit(0);
	});
});
