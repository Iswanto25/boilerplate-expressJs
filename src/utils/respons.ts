import { Response, Request } from "express";
import prisma from "../configs/database";
import moment from "moment";
moment.locale("id");

export enum HttpStatus {
	OK = 200,
	CREATED = 201,
	ACCEPTED = 202,
	NO_CONTENT = 204,
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	CONFLICT = 409,
	UNPROCESSABLE_ENTITY = 422,
	TOO_MANY_REQUESTS = 429,
	INTERNAL_SERVER_ERROR = 500,
	BAD_GATEWAY = 502,
	SERVICE_UNAVAILABLE = 503,
}

interface Log {
	idUsers?: string;
	username?: string;
	role?: string;
	ip?: string;
	method?: string;
	status?: number;
	host?: string;
	services?: string;
	date?: Date;
	data?: any;
}

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
				host: data.services ?? null,
				services: data.host ?? null,
				date: data.date ?? new Date(),
				data: data.data ?? null,
			},
		});
	} catch (error) {
		console.error("Logger error:", error);
	}
};

export const respons = {
	success(res: Response, message: string, data?: any, code: number = 200, req?: Request) {
		const logPayload: Log = {
			idUsers: req?.user?.id ?? null,
			username: req?.user?.username ?? null,
			role: req?.user?.role ?? null,
			ip: req?.ip ?? null,
			method: req?.method ?? null,
			status: code,
			host: data.services ?? null,
			services: req?.originalUrl ?? null,
			date: new Date(),
			data: data ?? null,
		};

		createLogger(logPayload).catch(() => {});

		return res.status(code).json({
			success: true,
			code,
			message,
			path: req?.originalUrl,
			timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
			data: data ?? null,
		});
	},

	error(res: Response, message: string, code: number = 400, error?: any, req?: Request) {
		const logPayload: Log = {
			idUsers: req?.user?.id ?? null,
			username: req?.user?.username ?? null,
			role: req?.user?.role ?? null,
			ip: req?.ip ?? null,
			method: req?.method ?? null,
			status: code,
			host: req?.hostname ?? null,
			services: req?.originalUrl ?? null,
			date: new Date(),
			data: error ?? null,
		};

		createLogger(logPayload).catch(() => {});

		return res.status(code).json({
			success: false,
			code,
			message,
			path: req?.originalUrl,
			timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
			error: process.env.NODE_ENV === "production" ? undefined : error,
		});
	},
};
