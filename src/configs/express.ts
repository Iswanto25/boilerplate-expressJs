import express from "express";
import cors, { CorsOptions } from "cors";
import compression from "compression";
import { pinoHttp } from "pino-http";
import helmet from "helmet";
import { logger } from "@/utils/logger.js";
import { respons, HttpStatus } from "@/utils/respons.js";
import apiRoutes from "@/routes/index.js";
import { errorHandler, notFoundHandler } from "@/middlewares/errorHandler.js";

export const app = express();

interface DecodedToken {
	id: string;
	email: string;
	roleId?: string;
	permissions?: any;
	profile?: any;
	roles?: any;
}

declare module "express-serve-static-core" {
	interface Request {
		user?: DecodedToken;
		startTime?: number;
	}
}

app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", "data:", "blob:"],
				fontSrc: ["'self'"],
				connectSrc: ["'self'"],
				frameAncestors: ["'none'"],
				baseUri: ["'self'"],
				formAction: ["'self'"],
				objectSrc: ["'none'"],
				scriptSrcAttr: ["'none'"],
				upgradeInsecureRequests: [],
			},
		},
		crossOriginEmbedderPolicy: { policy: "require-corp" },
		crossOriginOpenerPolicy: { policy: "same-origin" },
		crossOriginResourcePolicy: { policy: "same-origin" },
		originAgentCluster: true,
		referrerPolicy: { policy: "no-referrer" },
		strictTransportSecurity: {
			maxAge: 63072000,
			includeSubDomains: true,
			preload: true,
		},
		xContentTypeOptions: true,
		xDnsPrefetchControl: { allow: false },
		xDownloadOptions: true,
		xFrameOptions: { action: "deny" },
		xPermittedCrossDomainPolicies: { permittedPolicies: "none" },
	}),
);

app.use((req, res, next) => {
	res.setHeader("X-XSS-Protection", "0");
	res.setHeader(
		"Permissions-Policy",
		"camera=(), geolocation=(), microphone=(), fullscreen=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
	);
	next();
});

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()) : "*";

const corsOptions: CorsOptions = {
	origin: allowedOrigins === "*" ? "*" : allowedOrigins,
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	preflightContinue: false,
	optionsSuccessStatus: 204,
	credentials: allowedOrigins !== "*",
};

app.use(cors(corsOptions));
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

app.use((req, res, next) => {
	req.startTime = Date.now();
	next();
});

app.use(
	pinoHttp({
		logger,

		autoLogging: process.env.NODE_ENV !== "production",
		customSuccessMessage: (req, res, responseTime) => {
			return `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;
		},
		customErrorMessage: (req, res, err) => {
			return `${req.method} ${req.url} ${res.statusCode} - ERROR: ${err.message}`;
		},
		quietReqLogger: true,
	}),
);

app.get("/", (req, res) => res.redirect("/health"));
app.get("/health", (req, res) => {
	const data = {
		status: "ok",
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || "development",
	};
	return respons.success("Service is healthy", data, HttpStatus.OK, res, req);
});

app.use("/api", apiRoutes);

app.use(notFoundHandler);

app.use(errorHandler);
