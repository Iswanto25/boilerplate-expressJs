import { Response, Request } from "express";
import prisma from "../configs/database";
import { authenticate } from "../middlewares/authMiddleware";
import { logger } from "./logger";
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
	TOO_MANY_REQUESTS = 429,
	BAD_GATEWAY = 502,
	INTERNAL_SERVER_ERROR = 500,
}

const getRequestContext = async (req?: Request) => {
	if (!req) return { user: null, ip: "", host: "", userAgent: "", ua: { source: "Unknown" }, dateTimeNow: "" };
	moment.locale("id");
	const auth = req.headers?.authorization;

	let user = null;
	let userId: string | null = null;
	const token = auth?.startsWith("Bearer ") ? auth.split(" ")[1] : null;

	if (token) {
		const result = await authenticate.checkToken(req);
		if (result.valid && result.userId) {
			userId = result.userId;
			user = await prisma.user.findUnique({ where: { id: userId } });
		}
	}

	const forwardedForHeader = req.headers["x-forwarded-for"];
	const forwardedFor = Array.isArray(forwardedForHeader) ? forwardedForHeader[0] : forwardedForHeader;
	const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.socket.remoteAddress || "unknown";
	const host = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
	const userAgent = req.headers["user-agent"] || "Unknown";
	const dateTimeNow = moment().format("YYYY-MM-DD HH:mm:ss");

	return { user, ip, host, userAgent, dateTimeNow };
};

export const respons = {
	async success(message: any, data: any, code: number, res: Response, req: Request) {
		const { user, ip, host, userAgent, dateTimeNow } = await getRequestContext(req);

		const logPayload = {
			userId: user?.id,
			name: user?.name || "Unknown",
			role: user?.role,
			ip: ip,
			date: dateTimeNow,
			host,
			status: code.toString(),
			method: req?.method,
			data: {
				userAgent,
				timestamp: dateTimeNow,
				source: 'Success',
				message,
				data,
			},
		};

		logger.info(logPayload);

		await prisma.logs.create({
			data: logPayload,
		});

		res.status(code).json({
			status: code,
			message,
			data,
		});
	},

	async error(message: string, error: any, code: number, res: Response, req?: Request) {
		const { user, ip, host, userAgent, dateTimeNow } = await getRequestContext(req);

		const logPayload = {
			userId: user?.id,
			name: user?.name || "Unknown",
			role: user?.role,
			ip: ip,
			date: dateTimeNow,
			host,
			status: code.toString(),
			method: req?.method,
			data: {
				userAgent,
				timestamp: dateTimeNow,
				source: 'Error',
				message,
				error,
			},
		};

		logger.error(logPayload);

		await prisma.logs.create({
			data: logPayload,
		});
		res.status(code).json({
			status: code,
			message,
			error,
		});
	},
};

export class apiError extends Error {
	public statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);
		this.statusCode = statusCode;
		logger.error(message);
		Error.captureStackTrace(this, this.constructor);
	}
}
