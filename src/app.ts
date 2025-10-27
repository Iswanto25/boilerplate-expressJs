import { app } from "./configs/express";
import http from "http";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3006;

const server = http.createServer(app);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

console.info(`project running on ${PORT}`);
server.listen(PORT, () => {
	console.info(`version: 1.0`);
	console.info(`Server is running on port ${PORT}`);
	console.info(`http://0.0.0.0:${PORT}`);
});

process.on("SIGTERM", () => {
	console.info("SIGTERM signal received: closing HTTP server");
	server.close(() => {
		console.info("HTTP server closed");
		process.exit(0);
	});
});
