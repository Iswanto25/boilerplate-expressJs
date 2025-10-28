import { app } from "./configs/express";
import http from "http";
import dotenv from "dotenv";
dotenv.config({ quiet: process.env.NODE_ENV === "production" });


const PORT = Number(process.env.PORT) || 3006;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";
const server = http.createServer(app);

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

if (isProd) {
	console.info("Running in PRODUCTION mode");
} else {
	console.info("Running in DEVELOPMENT mode");
	console.info("Tips: Gunakan nodemon untuk auto-reload saat development");
}

server.listen(PORT, HOST, () => {
	const baseUrl = isProd ? process.env.BASE_URL || `https://${process.env.DOMAIN || "yourdomain.com"}` : `http://${HOST}:${PORT}`;

	console.info("========================================");
	console.info(`Server is running`);
	console.info(`Version: 1.0`);
	console.info(`Environment: ${NODE_ENV}`);
	console.info(`URL: ${baseUrl}`);
	console.info("========================================");
});

process.on("SIGTERM", () => {
	console.info("SIGTERM signal received: closing HTTP server");
	server.close(() => {
		console.info("HTTP server closed gracefully");
		process.exit(0);
	});
});
