import { Request, Response } from "express";
import { uploadServices } from "@/features/upload/services/upload.service.js";
import { HttpStatus, respons } from "@/utils/respons.js";
import { uploadValidation } from "@/features/upload/validations/upload.validation.js";

export const uploadController = {
	presignedUrl: async (req: Request, res: Response) => {
		try {
			const validation = uploadValidation.presignedUrl.safeParse(req.body);

			if (!validation.success) {
				const errorMsg = validation.error.issues[0]?.message || "Data tidak valid";
				return respons.error(errorMsg, errorMsg, HttpStatus.BAD_REQUEST, res, req);
			}

			const result = await uploadServices.getPresignedUrl(validation.data);
			return respons.success("Berhasil generate presigned URL", result, HttpStatus.OK, res, req);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			const message = err.message || "Terjadi kesalahan pada server";
			return respons.error(message, message, statusCode, res, req);
		}
	},

	confirm: async (req: Request, res: Response) => {
		try {
			const validation = uploadValidation.confirm.safeParse(req.body);

			if (!validation.success) {
				const errorMsg = validation.error.issues[0]?.message || "Data tidak valid";
				return respons.error(errorMsg, errorMsg, HttpStatus.BAD_REQUEST, res, req);
			}

			const { folder, fileName } = validation.data;
			const result = await uploadServices.confirmUpload(folder, fileName);
			return respons.success("Upload berhasil dikonfirmasi", result, HttpStatus.OK, res, req);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			const message = err.message || "Terjadi kesalahan pada server";
			return respons.error(message, message, statusCode, res, req);
		}
	},
};
