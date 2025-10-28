import { Request, Response, NextFunction } from "express";
import { jwtUtils } from "../utils/jwt";
import { respons, HttpStatus } from "../utils/respons";
import { getStoredToken } from "../utils/tokenStore";

export const authenticate = {
	async verifyToken(req: Request, res: Response, next: NextFunction) {
		const token = req.headers.authorization?.split(" ")[1];
		if (!token) {
			return respons.error(res, "Unauthorized", HttpStatus.UNAUTHORIZED);
		}
		try {
			const decoded = jwtUtils.verifyAccessToken(token);
			const storedToken = await getStoredToken(decoded.id, "access");
			if (storedToken !== token) {
				return res.status(401).json({ message: "Token tidak valid atau sudah dihapus" });
			}
			req.user = decoded;
			next();
		} catch (error) {
			return respons.error(res, "Invalid token", HttpStatus.UNAUTHORIZED);
		}
	},
};
