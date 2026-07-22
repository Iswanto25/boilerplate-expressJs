import { getPresignedUploadUrl, headFile, getPublicUrl } from "@/utils/s3.js";
import { apiError } from "@/utils/respons.js";

export const uploadServices = {
	async getPresignedUrl(input: {
		folder: string;
		contentType?: string;
		fileExtension?: string;
		expiresIn?: number;
		maxSize?: number;
	}) {
		const result = await getPresignedUploadUrl(input.folder, {
			contentType: input.contentType,
			fileExtension: input.fileExtension,
			expiresIn: input.expiresIn,
			maxSize: input.maxSize,
		});

		return result;
	},

	async confirmUpload(folder: string, fileName: string) {
		const file = await headFile(folder, fileName);
		if (!file.exists) {
			throw new apiError(404, "File tidak ditemukan di storage");
		}

		return {
			fileName,
			folder,
			url: getPublicUrl(folder, fileName),
		};
	},
};
