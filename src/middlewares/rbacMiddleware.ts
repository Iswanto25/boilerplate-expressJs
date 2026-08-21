import { Request, Response, NextFunction } from "express";
import { respons, HttpStatus } from "@/utils/respons.js";
import prisma from "@/configs/database.js";
import { Action } from "@prisma/client";

export const requirePermission = (resourceName: string, action: Action | string) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.user || !req.user.roleId) {
				return respons.error("Forbidden", "Akses ditolak", HttpStatus.FORBIDDEN, res, req);
			}

			if (req.user.roleName === "Superadmin") {
				return next();
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

			if (!rolePermission.grantedActions.includes(action as Action)) {
				return respons.error("Forbidden", `Anda tidak memiliki izin aksi '${action}' pada resource ini`, HttpStatus.FORBIDDEN, res, req);
			}

			next();
		} catch {
			return respons.error("Internal Server Error", "Gagal memverifikasi izin auth", HttpStatus.INTERNAL_SERVER_ERROR, res, req);
		}
	};
};
