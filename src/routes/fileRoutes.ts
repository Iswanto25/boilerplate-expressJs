import { Router, Request, Response, NextFunction } from "express";
import { uploadFile, getFile, deleteFile, uploadBase64 } from "../utils/s3";
import { respons, HttpStatus } from "../utils/respons";
import { createUploader } from "../middlewares/multerMiddleware";

const router = Router();

/**
 * @route   POST /api/v1/files/upload
 * @desc    Upload a file (multipart/form-data)
 * @access  Public (add authentication middleware as needed)
 */
router.post(
	"/upload",
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

/**
 * @route   POST /api/v1/files/upload-base64
 * @desc    Upload a base64 encoded file
 * @access  Public (add authentication middleware as needed)
 */
router.post("/upload-base64", async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { file, folder = "uploads", maxSizeMB = 5 } = req.body;

		if (!file) {
			return respons.error("No base64 file data provided", null, HttpStatus.BAD_REQUEST, res, req);
		}

		const result = await uploadBase64(file, folder, maxSizeMB, ["image/jpeg", "image/png", "image/jpg", "application/pdf"]);

		return respons.success("File uploaded successfully", result, HttpStatus.CREATED, res, req);
	} catch (error) {
		next(error);
	}
});

/**
 * @route   GET /api/v1/files/:folder/:fileName
 * @desc    Get a presigned URL for a file
 * @access  Public (add authentication middleware as needed)
 */
router.get("/:folder/:fileName", async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { folder, fileName } = req.params;
		const expiresIn = parseInt(req.query.expiresIn as string) || 3600; // Default 1 hour

		const url = await getFile(folder, fileName, expiresIn, { ensureExists: true });

		if (!url) {
			return respons.error("File not found", null, HttpStatus.NOT_FOUND, res, req);
		}

		return respons.success("File URL generated", { url, expiresIn }, HttpStatus.OK, res, req);
	} catch (error) {
		next(error);
	}
});

/**
 * @route   DELETE /api/v1/files/:folder/:fileName
 * @desc    Delete a file
 * @access  Public (add authentication middleware as needed)
 */
router.delete("/:folder/:fileName", async (req: Request, res: Response, next: NextFunction) => {
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
