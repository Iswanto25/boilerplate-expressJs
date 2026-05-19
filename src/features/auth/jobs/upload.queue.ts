import { Queue } from "bullmq";
import { bullConnection } from "@/configs/bull.js";

export const UPLOAD_QUEUE_NAME = "upload-queue";

export const uploadQueue = new Queue(UPLOAD_QUEUE_NAME, {
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
