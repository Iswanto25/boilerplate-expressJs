import { Request, Response, NextFunction } from "express";
import { respons, HttpStatus } from "../utils/respons";
import { logger } from "../utils/logger";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
	logger.error({
		error: err.message,
		stack: err.stack,
		path: req.path,
		method: req.method,
	});

	const statusCode = err.statusCode || err.status || HttpStatus.INTERNAL_SERVER_ERROR;

	return respons.error(err.message || "Internal server error", null, statusCode, res, req);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
	return respons.error(`Route ${req.method} ${req.path} not found`, null, HttpStatus.NOT_FOUND, res, req);
};
