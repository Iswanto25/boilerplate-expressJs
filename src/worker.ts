import { logger } from "@/utils/logger.js";

// Import all workers here
import "@/features/auth/jobs/upload.worker.js";

logger.info("All workers started and listening for jobs...");

process.on("SIGTERM", async () => {
	logger.info("SIGTERM received, closing workers...");
	const { uploadWorker } = await import("@/features/auth/jobs/upload.worker.js");
	await uploadWorker.close();
	process.exit(0);
});
