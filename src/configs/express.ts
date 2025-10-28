import express from "express";
import cors, { CorsOptions } from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { logger } from "../utils/logger";
import { uploadFile, getFile, deleteFile, uploadBase64 } from "../utils/s3";
import { respons, HttpStatus } from "../utils/respons";
import { createUploader } from "../middlewares/multerMiddleware";
import authRoutes from "../routes/authRoutes";

export const app = express();

declare module "express-serve-static-core" {
	interface Request {
		user?: any;
	}
}

app.use(
	helmet({
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false,
	}),
);

const corsOptions: CorsOptions = {
	origin: "*",
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	preflightContinue: false,
	optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(pinoHttp({ logger }));


// Routes Auth
app.use("/api/v1/auth", authRoutes);



app.get("/", (req, res) => res.redirect("/health"));
app.get("/health", (req, res) => {
	const data = {
		name: "Dummy",
	};
	return respons.success(res, "health", data, HttpStatus.OK, req);
});

app.post(
	"/upload",
	createUploader({ fields: [{ type: "single", fieldName: "file", allowedFormats: ["image/jpeg", "image/png"], maxSizeInMB: 1 }] }),
	async (req, res) => {
		try {
			if (!req.file) {
				return respons.error(res, "No file uploaded", HttpStatus.BAD_REQUEST);
			}
			const fileName = await uploadFile(req.file, "uploads");
			return respons.success(res, "File uploaded successfully", { fileName }, HttpStatus.OK);
		} catch (error) {
			return respons.error(res, "Error uploading file", HttpStatus.INTERNAL_SERVER_ERROR, error);
		}
	},
);

app.get("/test", async (req, res) => {
	try {
		const folder = "uploads";
		const fileName = "20251027-864xZ8Ryvwd.jpg";

		const url = await getFile(folder, fileName, 3600, { ensureExists: true });
		if (!url) {
			return respons.error(res, `File "${fileName}" di folder "${folder}" tidak ditemukan`, HttpStatus.NOT_FOUND, { folder, file: fileName });
		}

		return respons.success(res, "File retrieved successfully", { result: url }, HttpStatus.OK);
	} catch (error) {
		return respons.error(res, "Terjadi kesalahan", HttpStatus.INTERNAL_SERVER_ERROR, error);
	}
});

app.delete("/delete", async (req, res) => {
	try {
		const fileName = "20251027-6gXWZLFpYC.jpg";
		const folder = "uploads";
		const result = await deleteFile(folder, fileName);
		if (!result.deleted) {
			return respons.error(res, `File "${fileName}" di folder "${folder}" tidak ditemukan`, HttpStatus.NOT_FOUND, { folder, file: fileName });
		}
		return respons.success(res, "File deleted successfully", { result }, HttpStatus.OK);
	} catch (error) {
		return respons.error(res, "Error", HttpStatus.INTERNAL_SERVER_ERROR, error);
	}
});

app.post("/base64", async (req, res) => {
	try {
		const result = await uploadBase64(req.body.file, "uploads", 155, ["image/jpeg", "image/png"]);
		return respons.success(res, "File uploaded successfully", { result }, HttpStatus.OK);
	} catch (error) {
		return respons.error(res, "Error", HttpStatus.INTERNAL_SERVER_ERROR, error);
	}
});
