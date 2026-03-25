import { Request, Response, NextFunction } from "express";
import { respons, HttpStatus } from "@/utils/respons.js";
import { logger } from "@/utils/logger.js";

interface AppError extends Error {
	statusCode?: number;
	status?: number;
}

export const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction) => {
	const statusCode = err.statusCode || err.status || HttpStatus.INTERNAL_SERVER_ERROR;
	const isProduction = process.env.NODE_ENV === "production";

	// Log error lengkap untuk keperluan debugging internal
	logger.error({
		error: err.message,
		stack: isProduction ? undefined : err.stack,
		path: req.path,
		method: req.method,
		statusCode,
	});

	// Jika di produksi dan ini adalah error 500 (internal server error),
	// sembunyikan detail error agar tidak membocorkan struktur sistem/database.
	const message =
		isProduction && statusCode === HttpStatus.INTERNAL_SERVER_ERROR ? "Internal server error" : err.message || "Internal server error";

	return respons.error(message, null, statusCode, res, req);
};

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
	return respons.error(`Route ${req.method} ${req.path} not found`, null, HttpStatus.NOT_FOUND, res, req);
};
