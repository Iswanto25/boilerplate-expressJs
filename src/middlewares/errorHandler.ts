import { Request, Response, NextFunction } from "express";
import { respons, HttpStatus, apiError } from "@/utils/respons.js";

const errorTranslations: Record<string, string> = {
	"User not found": "User tidak ditemukan",
	"Invalid email": "Email tidak valid",
	"Invalid password": "Password salah",
	"Email already exists": "Email sudah terdaftar",
	"File not found in storage": "File tidak ditemukan di storage",
	Forbidden: "Anda tidak memiliki akses",
	Unauthorized: "Tidak terautentikasi",
	"Not found": "Tidak ditemukan",
	"Too many requests": "Terlalu banyak permintaan",
};

function translateMessage(message: string): string {
	return errorTranslations[message] || message;
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
	const isProduction = process.env.NODE_ENV === "production";

	let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
	let hint: string | undefined;

	if (err instanceof apiError) {
		statusCode = err.statusCode;
		hint = err.hint;
	} else if ("statusCode" in err) {
		statusCode = (err as any).statusCode;
	} else if ("status" in err) {
		statusCode = (err as any).status;
	}

	const rawMessage = err.message || "Terjadi kesalahan pada server";
	const message = isProduction && statusCode === HttpStatus.INTERNAL_SERVER_ERROR ? "Internal server error" : translateMessage(rawMessage);

	return respons.error(message, hint || message, statusCode, res, req);
};

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
	const isProduction = process.env.NODE_ENV === "production";
	const message = isProduction ? "Not found" : `Route ${req.method} ${req.path} not found`;

	return respons.error(message, "Not Found", HttpStatus.NOT_FOUND, res, req);
};
