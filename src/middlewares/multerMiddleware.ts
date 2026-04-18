import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { respons, HttpStatus } from "@/utils/respons.js";
import { logger } from "@/utils/logger.js";

type FieldConfig = {
	type: "single" | "array";
	fieldName: string;
	maxCount?: number;
	allowedFormats: string[];
	maxSizeInMB: number;
};

interface MulterConfig {
	fields: FieldConfig[];
}

export function createUploader(config: MulterConfig) {
	const storage = multer.diskStorage({
		destination: "uploads/",
		filename: (_, file, cb) => {
			const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
			cb(null, uniqueName);
		},
	});

	const allAllowed = new Set(config.fields.flatMap((f) => f.allowedFormats));

	const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
		const ext = path.extname(file.originalname).toLowerCase();
		const isAllowed = allAllowed.has(file.mimetype) || allAllowed.has(ext.replace(".", ""));

		if (!isAllowed) {
			return cb(new Error(`File type not allowed: ${file.mimetype}`));
		}
		cb(null, true);
	};

	const maxSize = Math.max(...config.fields.map((f) => f.maxSizeInMB)) * 1024 * 1024;

	const upload = multer({
		storage,
		fileFilter,
		limits: { fileSize: maxSize },
	});

	const fields = config.fields.map((f) => ({
		name: f.fieldName,
		maxCount: f.maxCount || 1,
	}));

	let middleware: ReturnType<typeof upload.single> | ReturnType<typeof upload.array> | ReturnType<typeof upload.fields>;

	if (config.fields.length === 1) {
		const field = config.fields[0];
		if (field.type === "single") {
			middleware = upload.single(field.fieldName);
		} else {
			middleware = upload.array(field.fieldName, field.maxCount || 10);
		}
	} else {
		middleware = upload.fields(fields);
	}

	return (req: Request, res: Response, next: NextFunction) => {
		middleware(req, res, (err: unknown) => {
			if (res.headersSent) return;
			if (err instanceof multer.MulterError) {
				switch (err.code) {
					case "LIMIT_FILE_SIZE":
						return respons.error("Ukuran file terlalu besar", null, HttpStatus.PAYLOAD_TOO_LARGE, res, req);
					case "LIMIT_FILE_COUNT":
						return respons.error("Terlalu banyak file diunggah", null, HttpStatus.BAD_REQUEST, res, req);
					case "LIMIT_UNEXPECTED_FILE":
						return respons.error("Terlalu banyak file diunggah", null, HttpStatus.BAD_REQUEST, res, req);
					default:
						return respons.error("Terjadi kesalahan", null, HttpStatus.BAD_REQUEST, res, req);
				}
			}

			if (err instanceof Error && err.message.includes("File type not allowed")) {
				return respons.error("Format file tidak diizinkan", null, HttpStatus.BAD_REQUEST, res, req);
			}

			if (err) {
				logger.error({ err }, "[Uploader Error]");
				return respons.error("Terjadi kesalahan", null, HttpStatus.INTERNAL_SERVER_ERROR, res, req);
			}

			next();
		});
	};
}
