import { logger } from "@/utils/logger.js";
import { uploadBase64, deleteFile } from "@/utils/s3.js";
import { authRepository } from "@/features/auth/repositories/auth.repository.js";

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
