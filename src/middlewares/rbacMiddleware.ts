import { Request, Response, NextFunction } from "express";
import { respons, HttpStatus } from "../utils/respons.js";
import prisma from "../configs/database.js";

export const requirePermission = (resourceName: string, action: string) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.user || !req.user.roleId) {
				return respons.error("Forbidden", "Akses ditolak", HttpStatus.FORBIDDEN, res, req);
			}

			const rolePermission = await prisma.rolePermission.findFirst({
				where: {
					roleId: req.user.roleId,
					resource: {
						name: resourceName,
					},
				},
			});

			if (!rolePermission) {
				return respons.error("Forbidden", "Anda tidak memiliki izin untuk resource ini", HttpStatus.FORBIDDEN, res, req);
			}

			if (!rolePermission.grantedActions.includes(action)) {
				return respons.error(
					"Forbidden",
					`Anda tidak memiliki izin aksi '${action}' pada resource ini`,
					HttpStatus.FORBIDDEN,
					res,
					req
				);
			}

			next();
		} catch (error) {
			return respons.error("Internal Server Error", "Gagal memverifikasi izin auth", HttpStatus.INTERNAL_SERVER_ERROR, res, req);
		}
	};
};
