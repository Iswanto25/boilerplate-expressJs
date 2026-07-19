import { logger } from "@/utils/logger.js";

import "@/features/auth/jobs/auth.jobs.js";

logger.info("All workers started and listening for jobs...");

process.on("SIGTERM", async () => {
	logger.info("SIGTERM received, closing workers...");
	const { authWorker } = await import("@/features/auth/jobs/auth.jobs.js");
	await authWorker.close();
	process.exit(0);
});
