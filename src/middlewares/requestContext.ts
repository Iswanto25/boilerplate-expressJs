import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

const SENSITIVE_FIELDS =
	/password|token|secret|credential|authorization|api.?key|access.?token|refresh.?token|\bnik\b|\bktp\b|^nik[A-Z_]|^no_?nik|^user_?nik|^no_?ktp|^user_?ktp/i;
const BASE64_PREFIX = /^data:image\/[a-z]+;base64,/;
const MAX_BASE64_SHOWN = 60;

declare module "express-serve-static-core" {
	interface Request {
		reqId: string;
		rawBody?: unknown;
	}
}

export function requestContext(req: Request, _res: Response, next: NextFunction): void {
	req.reqId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
	req.startTime = Date.now();

	if (req.body && typeof req.body === "object" && Object.keys(req.body as object).length > 0) {
		req.rawBody = maskSensitive(cloneDeep(req.body));
	}

	next();
}

function cloneDeep<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

export function maskSensitive(data: unknown): unknown {
	if (typeof data !== "object" || data === null) return data;

	if (Array.isArray(data)) {
		return data.map(maskSensitive);
	}

	const masked: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
		if (SENSITIVE_FIELDS.test(key)) {
			masked[key] = "***";
		} else if (typeof value === "object" && value !== null) {
			masked[key] = maskSensitive(value);
		} else {
			masked[key] = value;
		}
	}
	return masked;
}

export function truncateLongStrings(data: unknown): unknown {
	if (typeof data === "string") {
		if (BASE64_PREFIX.test(data) && data.length > MAX_BASE64_SHOWN) {
			return data.slice(0, MAX_BASE64_SHOWN) + "...";
		}
		return data;
	}

	if (Array.isArray(data)) {
		return data.map(truncateLongStrings);
	}

	if (data && typeof data === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
			result[key] = truncateLongStrings(value);
		}
		return result;
	}

	return data;
}
