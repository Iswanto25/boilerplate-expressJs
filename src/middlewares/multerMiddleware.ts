import multer from "multer";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { respons, HttpStatus } from "../utils/respons";

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
			const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
			cb(null, uniqueName);
		},
	});

	const allAllowed = config.fields.flatMap((f) => f.allowedFormats);

	const fileFilter = (_: any, file: Express.Multer.File, cb: any) => {
		const ext = path.extname(file.originalname).toLowerCase();
		const isAllowed = allAllowed.includes(file.mimetype) || allAllowed.includes(ext.replace(".", ""));

		if (!isAllowed) {
			return cb(new Error(`File type not allowed: ${file.mimetype}`), false);
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

	const middleware =
		config.fields.length === 1
			? config.fields[0].type === "single"
				? upload.single(config.fields[0].fieldName)
				: upload.array(config.fields[0].fieldName, config.fields[0].maxCount || 10)
			: upload.fields(fields);

	return (req: Request, res: Response, next: NextFunction) => {
		middleware(req, res, (err: any) => {
			if (res.headersSent) return;
			if (err instanceof multer.MulterError) {
				switch (err.code) {
					case "LIMIT_FILE_SIZE":
						return respons.error(res, "Ukuran file terlalu besar", HttpStatus.BAD_REQUEST, err.message);
					case "LIMIT_FILE_COUNT":
						return respons.error(res, "Jumlah file melebihi batas", HttpStatus.BAD_REQUEST, err.message);
					case "LIMIT_UNEXPECTED_FILE":
						return respons.error(res, "Terlalu banyak file diunggah", HttpStatus.BAD_REQUEST, err.message);
					default:
						return respons.error(res, "Terjadi kesalahan saat upload file", HttpStatus.BAD_REQUEST, err.message);
				}
			}

			if (err && err.message?.includes("File type not allowed")) {
				return respons.error(res, "Format file tidak diperbolehkan", HttpStatus.UNPROCESSABLE_ENTITY, err.message);
			}

			if (err) {
				console.error("[Uploader Error]", err);
				return respons.error(res, "Kesalahan server saat upload file", HttpStatus.INTERNAL_SERVER_ERROR, err.message);
			}

			next();
		});
	};
}
