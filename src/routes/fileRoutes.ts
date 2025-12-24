import { Router, Request, Response, NextFunction } from "express";
import { uploadFile, getFile, deleteFile, uploadBase64, isS3Configured } from "../utils/s3";
import { respons, HttpStatus } from "../utils/respons";
import { createUploader } from "../middlewares/multerMiddleware";

const router = Router();

const requireS3 = (req: Request, res: Response, next: NextFunction) => {
	if (!isS3Configured) {
		return respons.error(
			"File storage not configured",
			"S3/MinIO is not configured. Please set MINIO_ENDPOINT, MINIO_BUCKET_NAME, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY in your environment variables.",
			HttpStatus.SERVICE_UNAVAILABLE,
			res,
			req,
		);
	}
	next();
};

router.post(
	"/upload",
	requireS3,
	createUploader({
		fields: [
			{
				type: "single",
				fieldName: "file",
				allowedFormats: ["image/jpeg", "image/png", "image/jpg", "application/pdf"],
				maxSizeInMB: 5,
			},
		],
	}),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.file) {
				return respons.error("No file uploaded", null, HttpStatus.BAD_REQUEST, res, req);
			}

			const folder = req.body.folder || "uploads";
			const fileName = await uploadFile(req.file, folder);

			return respons.success("File uploaded successfully", { fileName, folder }, HttpStatus.CREATED, res, req);
		} catch (error) {
			next(error);
		}
	},
);

router.post("/upload-base64", requireS3, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { file, folder = "uploads", maxSizeMB = 5 } = req.body;

		if (!file) {
			return respons.error("No base64 file data provided", null, HttpStatus.BAD_REQUEST, res, req);
		}

		const result = await uploadBase64(folder, file, maxSizeMB, ["image/jpeg", "image/png", "image/jpg", "application/pdf"]);

		return respons.success("File uploaded successfully", result, HttpStatus.CREATED, res, req);
	} catch (error) {
		next(error);
	}
});

router.get("/:folder/:fileName", requireS3, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { folder, fileName } = req.params;
		const expiresIn = parseInt(req.query.expiresIn as string) || 3600;

		const url = await getFile(folder, fileName, expiresIn, { ensureExists: true });

		if (!url) {
			return respons.error("File not found", null, HttpStatus.NOT_FOUND, res, req);
		}

		return respons.success("File URL generated", { url, expiresIn }, HttpStatus.OK, res, req);
	} catch (error) {
		next(error);
	}
});

router.delete("/:folder/:fileName", requireS3, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { folder, fileName } = req.params;
		const result = await deleteFile(folder, fileName);

		if (!result.deleted) {
			return respons.error("File not found or already deleted", null, HttpStatus.NOT_FOUND, res, req);
		}

		return respons.success("File deleted successfully", result, HttpStatus.OK, res, req);
	} catch (error) {
		next(error);
	}
});

export default router;
