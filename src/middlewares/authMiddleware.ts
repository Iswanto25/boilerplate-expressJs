import { Request, Response, NextFunction } from "express";
import { jwtUtils } from "@/utils/jwt.js";
import { respons, HttpStatus } from "@/utils/respons.js";
import { getStoredToken } from "@/utils/tokenStore.js";
import prisma from "@/configs/database.js";

export const authenticate = {
	async checkToken(req: Request): Promise<{ valid: boolean; userId?: string }> {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return { valid: false };
		}

		const token = authHeader.split(" ")[1];
		try {
			const decoded = jwtUtils.verifyAccessToken(token);
			const storedToken = await getStoredToken(decoded.id, "access");
			if (storedToken !== token) return { valid: false };
			return { valid: true, userId: decoded.id };
		} catch {
			return { valid: false };
		}
	},

	async verifyToken(req: Request, res: Response, next: NextFunction) {
		const result = await authenticate.checkToken(req);
		if (!result.valid || !result.userId) {
			return respons.error("Unauthorized", "Token tidak valid", HttpStatus.UNAUTHORIZED, res, req);
		}

		const existingUser = await prisma.user.findUnique({ where: { id: result.userId } });

		if (!existingUser) {
			return respons.error("User not found", "User tidak ditemukan", HttpStatus.UNAUTHORIZED, res, req);
		}

		req.user = {
			id: existingUser.id,
			email: existingUser.email,
			roleId: existingUser.roleId,
		};
		next();
	},
};
