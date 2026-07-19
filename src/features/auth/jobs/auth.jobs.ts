import { Queue, Worker, Job } from "bullmq";
import { bullConnection } from "@/configs/bull.js";
import { logger } from "@/utils/logger.js";
import { uploadBase64, deleteFile } from "@/utils/s3.js";
import { authRepository } from "@/features/auth/repositories/auth.repository.js";

export const AUTH_QUEUE_NAME = "auth-queue";

export const authQueue = new Queue(AUTH_QUEUE_NAME, {
	connection: bullConnection,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 1000,
		},
		removeOnComplete: true,
		removeOnFail: false,
	},
});

export interface UploadJobData {
	base64Data: string;
	folder: string;
	maxSizeMB: number;
	allowedFormats: string[];
	userId: string;
	oldPhotoFileName?: string;
}

export const processUploadJob = async (data: UploadJobData) => {
	logger.info({ userId: data.userId, folder: data.folder }, "Starting upload processing job...");

	const result = await uploadBase64(data.folder, data.base64Data, data.maxSizeMB, data.allowedFormats);

	await authRepository.transaction(async (tx: any) => {
		await authRepository.updateUserProfile(data.userId, { photo: result.fileName }, undefined, tx);
	});

	if (data.oldPhotoFileName) {
		await deleteFile(data.folder, data.oldPhotoFileName, { strict: false });
	}

	logger.info({ userId: data.userId, fileName: result.fileName }, "Upload processing completed successfully.");

	return { success: true, fileName: result.fileName };
};

export const authWorker = new Worker(
	AUTH_QUEUE_NAME,
	async (job: Job) => {
		try {
			logger.info({ jobId: job.id, jobName: job.name }, "Processing job...");

			switch (job.name) {
				case "upload-profile-photo":
					return await processUploadJob(job.data as UploadJobData);
				default:
					logger.warn({ jobName: job.name }, "Unknown job name");
					return null;
			}
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

authWorker.on("completed", (job) => {
	logger.info({ jobId: job.id, jobName: job.name }, "Job completed");
});

authWorker.on("failed", (job, err) => {
	logger.error({ jobId: job?.id, jobName: job?.name, err }, "Job failed");
});

logger.info(`Worker for ${AUTH_QUEUE_NAME} started`);
