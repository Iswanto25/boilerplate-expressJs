import { Response, Request } from "express";
import prisma from "../configs/database.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { logger } from "./logger.js";
import { formatDateTime } from "./utils.js";

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
	TOO_MANY_REQUESTS = 429,
	BAD_GATEWAY = 502,
	SERVICE_UNAVAILABLE = 503,
	INTERNAL_SERVER_ERROR = 500,
}

const getRequestContext = async (req?: Request) => {
	if (!req) return { user: null, ip: "", host: "", userAgent: "", ua: { source: "Unknown" }, dateTimeNow: "" };
	const auth = req.headers?.authorization;

	let user = null;
	let userId: string | null = null;
	const token = auth?.startsWith("Bearer ") ? auth.split(" ")[1] : null;

	if (token) {
		const result = await authenticate.checkToken(req);
		if (result.valid && result.userId) {
			userId = result.userId;
			user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
		}
	}

	const forwardedForHeader = req.headers["x-forwarded-for"];
	const ip = forwardedForHeader?.toString().split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
	const host = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
	const userAgent = req.headers["user-agent"] || "Unknown";
	const dateTimeNow = formatDateTime();

	return { user, ip, host, userAgent, dateTimeNow };
};

export const respons = {
	async success(message: string, data: unknown, code: number, res: Response, req: Request, pagination?: any) {
		const { user, ip, host, userAgent, dateTimeNow } = await getRequestContext(req);

		// Calculate response time
		const startTime = req.startTime || Date.now();
		const responseTime = Date.now() - startTime;

		const logPayload = {
			userId: user?.id,
			name: (user as any)?.profile?.name || "Unknown",
			role: user?.role,
			ip: ip,
			date: dateTimeNow,
			host,
			status: code.toString(),
			method: req?.method,
			data: {
				userAgent,
				timestamp: dateTimeNow,
				source: "Success",
				message,
				data: data as any,
			},
		};

		// Simplified console log with response time
		const path = req.path || req.originalUrl;
		const userName = (user as any)?.profile?.name || "Guest";
		logger.info(`✅ ${req.method} ${path} ${code} | ${userName} | ${responseTime}ms`);

		try {
			await prisma.logs.create({
				data: logPayload,
			});
		} catch (dbError) {
			logger.warn({ dbError }, "Failed to write success log to database");
		}

		res.status(code).json({
			success: true,
			message,
			data: data,
			...(pagination && { pagination }),
		});
	},

	async error(message: string, error: unknown, code: number, res: Response, req?: Request) {
		const { user, ip, host, userAgent, dateTimeNow } = await getRequestContext(req);

		// Calculate response time
		const startTime = req?.startTime || Date.now();
		const responseTime = Date.now() - startTime;

		const logPayload = {
			userId: user?.id,
			name: (user as any)?.profile?.name || "Unknown",
			role: user?.role,
			ip: ip,
			date: dateTimeNow,
			host,
			status: code.toString(),
			method: req?.method,
			data: {
				userAgent,
				timestamp: dateTimeNow,
				source: "Error",
				message,
				hint: (error as any)?.hint || (error as any)?.code || undefined,
				error: error as any,
			},
		};

		// Simplified console log with response time
		const path = req?.path || req?.originalUrl || "unknown";
		const userName = (user as any)?.profile?.name || "Guest";
		const errorHint = (error as any)?.hint || (error as any)?.code || "";
		logger.error(`❌ ${req?.method} ${path} ${code} | ${message} ${errorHint ? `(${errorHint}) ` : ""}| ${userName} | ${responseTime}ms`);

		try {
			await prisma.logs.create({
				data: logPayload,
			});
		} catch (dbError) {
			logger.warn({ dbError }, "Failed to write error log to database");
		}
		res.status(code).json({
			success: false,
			message,
			hint: (error as any)?.hint || (error as any)?.code || undefined,
			error,
		});
	},
};

export class apiError extends Error {
	public statusCode: number;
	public hint?: string;

	constructor(statusCode: number, message: string, hint?: string) {
		super(message);
		this.statusCode = statusCode;
		this.hint = hint;
		logger.error(`${message}${hint ? ` (Hint: ${hint})` : ""}`);
		Error.captureStackTrace(this, this.constructor);
	}
}
