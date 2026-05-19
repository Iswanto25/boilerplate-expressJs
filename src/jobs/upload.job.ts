import { logger } from "@/utils/logger.js";

export interface UploadJobData {
	fileId: string;
	fileName: string;
	userId: string;
}

export const processUploadJob = async (data: UploadJobData) => {
	logger.info({ data }, "Starting upload processing job...");

	// Simulate processing time
	await new Promise((resolve) => setTimeout(resolve, 2000));

	logger.info({ fileId: data.fileId }, "Upload processing completed successfully.");

	return { success: true, fileId: data.fileId };
};
