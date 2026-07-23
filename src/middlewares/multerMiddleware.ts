import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { apiError, HttpStatus, respons } from "@/utils/respons.js";

const allowedMimes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
	fileFilter: (_req, file, cb) => {
		if (allowedMimes.includes(file.mimetype.toLowerCase())) {
			cb(null, true);
		} else {
			cb(new apiError(415, "Tipe file tidak diizinkan. Gunakan format JPEG, PNG, JPG, atau WEBP."));
		}
	},
});

export const uploadSinglePhoto = (req: Request, res: Response, next: NextFunction) => {
	upload.single("photo")(req, res, (err: any) => {
		if (err) {
			if (err instanceof multer.MulterError) {
				if (err.code === "LIMIT_FILE_SIZE") {
					return respons.error(
						"Ukuran file terlalu besar. Maksimum 5MB.",
						"Ukuran file terlalu besar. Maksimum 5MB.",
						HttpStatus.PAYLOAD_TOO_LARGE,
						res,
						req,
					);
				}
				return respons.error(err.message, err.message, HttpStatus.BAD_REQUEST, res, req);
			}
			const statusCode = err.statusCode || HttpStatus.BAD_REQUEST;
			return respons.error(err.message || "Gagal mengupload file", err.message || "Gagal mengupload file", statusCode, res, req);
		}
		if (!req.file) {
			return respons.error("File foto wajib diunggah", "File foto wajib diunggah", HttpStatus.BAD_REQUEST, res, req);
		}
		next();
	});
};
