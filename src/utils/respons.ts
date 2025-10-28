import { Response, Request } from "express";
import prisma from "../configs/database";
import moment from "moment";
moment.locale("id");

export enum HttpStatus {
	OK = 200,
	CREATED = 201,
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	CONFLICT = 409,
	PAYLOAD_TOO_LARGE = 413,
	UNPROCESSABLE_ENTITY = 422,
	UNSUPPORTED_MEDIA_TYPE = 415,
	BAD_GATEWAY = 502,
	INTERNAL_SERVER_ERROR = 500,
}

interface Log {
	idUsers?: string;
	username?: string;
	role?: string;
	ip?: string;
	method?: string;
	status?: number;
	host?: string; // domain:port
	services?: string; // endpoint path or app name
	date?: Date;
	data?: any;
}

/** Fix: mapping host/services tidak dibalik */
export const createLogger = async (data: Log) => {
	try {
		await prisma.logs.create({
			data: {
				idUsers: data.idUsers ?? null,
				username: data.username ?? null,
				role: data.role ?? null,
				ip: data.ip ?? null,
				method: data.method ?? null,
				status: data.status ?? null,
				host: data.host ?? null, // <-- benar
				services: data.services ?? null, // <-- benar
				date: data.date ?? new Date(),
				data: data.data ?? null,
			},
		});
	} catch (error) {
		console.error("Logger error:", error);
	}
};

function extractHost(req?: Request) {
	// prioritaskan x-forwarded-host (di balik reverse proxy)
	const xf = req?.headers?.["x-forwarded-host"];
	if (Array.isArray(xf)) return xf[0] ?? null;
	return (xf as string) || (req?.headers?.host as string) || null;
}

function extractPath(req?: Request) {
	return req?.originalUrl || req?.url || null;
}

export const respons = {
	success(res: Response, message: string, data?: any, code: number = HttpStatus.OK, req?: Request) {
		const logPayload: Log = {
			idUsers: req?.user?.id ?? null,
			username: req?.user?.username ?? null,
			role: req?.user?.role ?? null,
			ip: req?.ip ?? null,
			method: req?.method ?? null,
			status: code,
			host: extractHost(req), // <-- ambil dari header
			services: extractPath(req), // <-- simpan endpoint path
			date: new Date(),
			data: data ?? null,
		};

		createLogger(logPayload).catch(() => {});

		return res.status(code).json({
			success: true,
			code,
			message,
			path: extractPath(req),
			timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
			data: data ?? null,
		});
	},

	error(res: Response, message: string, fallbackCode: number = HttpStatus.INTERNAL_SERVER_ERROR, error?: any) {
		const derivedCode =
			error && Number.isInteger(error.httpStatus) && error.httpStatus >= 400 && error.httpStatus <= 599
				? error.httpStatus
				: error?.code === "UNSUPPORTED_MEDIA_TYPE"
				? HttpStatus.UNSUPPORTED_MEDIA_TYPE
				: error?.code === "INVALID_BASE64"
				? HttpStatus.BAD_REQUEST
				: error?.code === "PAYLOAD_TOO_LARGE"
				? HttpStatus.PAYLOAD_TOO_LARGE
				: error?.code === "STORAGE_WRITE_FAILED"
				? HttpStatus.BAD_GATEWAY
				: error?.code === "NOT_FOUND"
				? HttpStatus.NOT_FOUND
				: fallbackCode;

		const req = res.req as Request | undefined;

		const logPayload: Log = {
			idUsers: req?.user?.id ?? null,
			username: req?.user?.username ?? null,
			role: req?.user?.role ?? null,
			ip: req?.ip ?? null,
			method: req?.method ?? null,
			status: derivedCode,
			host: extractHost(req), // <-- konsisten
			services: extractPath(req), // <-- konsisten
			date: new Date(),
			data: error ?? null,
		};

		createLogger(logPayload).catch(() => {});

		return res.status(derivedCode).json({
			success: false,
			code: derivedCode,
			message,
			path: extractPath(req),
			timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
			error,
		});
	},
};
