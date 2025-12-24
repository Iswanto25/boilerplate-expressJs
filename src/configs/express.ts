import express from "express";
import cors, { CorsOptions } from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { logger } from "../utils/logger";
import { respons, HttpStatus } from "../utils/respons";
import authRoutes from "../routes/authRoutes";
import fileRoutes from "../routes/fileRoutes";
import { errorHandler, notFoundHandler } from "../middlewares/errorHandler";

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

// CORS configuration with environment-based origins
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()) : "*";

const corsOptions: CorsOptions = {
	origin: allowedOrigins === "*" ? "*" : allowedOrigins,
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	preflightContinue: false,
	optionsSuccessStatus: 204,
	credentials: allowedOrigins !== "*", // Only allow credentials if specific origins are set
};

app.use(cors(corsOptions));
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(pinoHttp({ logger }));

// Health check route
app.get("/", (req, res) => res.redirect("/health"));
app.get("/health", (req, res) => {
	const data = {
		status: "ok",
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || "development",
	};
	return respons.success("Service is healthy", data, HttpStatus.OK, res, req);
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/files", fileRoutes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);
