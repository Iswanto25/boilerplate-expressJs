import { Request, Response, NextFunction } from "express";
import { respons, HttpStatus } from "../utils/respons";
import { logger } from "../utils/logger";

/**
 * Global error handling middleware
 * Catches all errors and returns a consistent error response
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
	// Log the error
	logger.error({
		error: err.message,
		stack: err.stack,
		path: req.path,
		method: req.method,
	});

	// Determine status code
	const statusCode = err.statusCode || err.status || HttpStatus.INTERNAL_SERVER_ERROR;

	// Return error response
	return respons.error(err.message || "Internal server error", null, statusCode, res, req);
};

/**
 * 404 Not Found handler
 * Handles requests to undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
	return respons.error(`Route ${req.method} ${req.path} not found`, null, HttpStatus.NOT_FOUND, res, req);
};
