import { z } from "zod";

export const uploadValidation = {
	presignedUrl: z.object({
		folder: z.string().min(1, { message: "Folder is required" }),
		contentType: z.string().optional(),
		fileExtension: z.string().optional(),
		expiresIn: z.coerce.number().int().positive().max(86400).optional(),
		maxSize: z.coerce.number().int().positive().optional(),
	}),

	confirm: z.object({
		folder: z.string().min(1, { message: "Folder is required" }),
		fileName: z.string().min(1, { message: "File name is required" }),
	}),
};
