import { Request, Response } from "express";
import { authServices } from "../services/authServices";
import { HttpStatus, respons } from "../../../utils/respons";
import { deleteToken } from "../../../utils/tokenStore";

export const authController = {
	register: async (req: Request, res: Response) => {
		try {
			const { name, email, password } = req.body;

			if (!name || !email || !password) {
				return respons.error(res, "Data tidak lengkap", HttpStatus.BAD_REQUEST);
			}

			const user = await authServices.register({ name, email, password });
			return respons.success(res, "Berhasil mendaftar", user, HttpStatus.CREATED);
		} catch (error: any) {
			const message = error.message === "Email already exists" ? "Email sudah terdaftar" : "Terjadi kesalahan pada server";
			return respons.error(res, message, HttpStatus.INTERNAL_SERVER_ERROR, error);
		}
	},

	login: async (req: Request, res: Response) => {
		try {
			const { email, password } = req.body;

			if (!email || !password) {
				return respons.error(res, "Data tidak lengkap", HttpStatus.BAD_REQUEST);
			}

			const user = await authServices.login(email, password);
			return respons.success(res, "Berhasil login", user, HttpStatus.OK);
		} catch (error: any) {
			const message = error.message === "User not found" ? "User tidak ditemukan" : "Terjadi kesalahan pada server";
			return respons.error(res, message, HttpStatus.INTERNAL_SERVER_ERROR, error);
		}
	},

	logout: async (req: Request, res: Response) => {
		try {
			await authServices.logout(req.user.id);
			return respons.success(res, "Berhasil logout", null, HttpStatus.OK);
		} catch (error: any) {
			return respons.error(res, "Terjadi kesalahan pada server", HttpStatus.INTERNAL_SERVER_ERROR, error);
		}
	},

	refreshToken: async (req: Request, res: Response) => {
		try {
			const { refreshToken } = req.body;
			if (!refreshToken) {
				return respons.error(res, "Refresh token tidak ditemukan", HttpStatus.BAD_REQUEST);
			}

			const user = await authServices.refreshToken(refreshToken);
			return respons.success(res, "Berhasil refresh token", user, HttpStatus.OK);
		} catch (error: any) {
			return respons.error(res, "Terjadi kesalahan pada server", HttpStatus.INTERNAL_SERVER_ERROR, error);
		}
	},

	profile: async (req: Request, res: Response) => {
		try {
			console.log(req.user);
			
			const user = await authServices.profile(req.user.id);
			return respons.success(res, "Berhasil mendapatkan profile", user, HttpStatus.OK);
		} catch (error: any) {
			return respons.error(res, "Terjadi kesalahan pada server", HttpStatus.INTERNAL_SERVER_ERROR, error);
		}
	},
};
