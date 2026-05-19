import { Worker, Job } from "bullmq";
import { bullConnection } from "@/configs/bull.js";
import { UPLOAD_QUEUE_NAME } from "@/queues/upload.queue.js";
import { processUploadJob, UploadJobData } from "@/jobs/upload.job.js";
import { logger } from "@/utils/logger.js";

export const uploadWorker = new Worker(
	UPLOAD_QUEUE_NAME,
	async (job: Job<UploadJobData>) => {
		try {
			logger.info({ jobId: job.id, jobName: job.name }, "Processing job...");
			const result = await processUploadJob(job.data);
			return result;
		} catch (error) {
			logger.error({ error, jobId: job.id }, "Error processing job");
			throw error;
		}
	},
	{
		connection: bullConnection,
		concurrency: 5,
	},
);

uploadWorker.on("completed", (job) => {
	logger.info({ jobId: job.id }, "Job completed");
});

uploadWorker.on("failed", (job, err) => {
	logger.error({ jobId: job?.id, err }, "Job failed");
});

logger.info("Upload worker started");
