import express from "express";
import cors, { CorsOptions } from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { logger } from "../utils/logger";
import { uploadFile } from "../utils/s3";
import { respons, HttpStatus } from "../utils/respons";
import { createUploader } from "../middlewares/multerMiddleware";

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

app.get("/", (req, res) => res.redirect("/health"));
app.get("/health", (req, res) => {
	const data = {
		name: "Dummy"
	}
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

app.get("/test", (req, res) => {
	
});
