import { Request, Response } from "express";
import { authServices } from "../services/authServices";
import { HttpStatus, respons } from "../../../utils/respons";

export const authController = {
	register: async (req: Request, res: Response) => {
		try {

			const data = {
				name: req.body.name,
				email: req.body.email,
				password: req.body.password,
				address: req.body.address,
				phone: req.body.phone,
				photo: req.body.photo,
			}

			if (!data.name || !data.email || !data.password) {
				return respons.error("Data tidak lengkap", null, HttpStatus.BAD_REQUEST, res, req);
			}

			const user = await authServices.register(data);
			return respons.success("Berhasil register", user, HttpStatus.OK, res, req);
		} catch (error: any) {
			const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = error.message || "Terjadi kesalahan pada server";

			if (message === "Email already exists") message = "Email sudah terdaftar";
			return respons.error(message, null, statusCode, res, req);
		}
	},

	login: async (req: Request, res: Response) => {
		try {
			const { email, password } = req.body;

			if (!email || !password) {
				return respons.error("Data tidak lengkap", null, HttpStatus.BAD_REQUEST, res, req);
			}

			const user = await authServices.login(email, password);
			return respons.success("Berhasil login", user, HttpStatus.OK, res, req);
		} catch (error: any) {
			const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = error.message || "Terjadi kesalahan pada server";

			if (message === "User not found") message = "User tidak ditemukan";
			return respons.error(message, null, statusCode, res, req);
		}
	},

	logout: async (req: Request, res: Response) => {
		try {
			await authServices.logout(req.user.id);
			return respons.success("Berhasil logout", null, HttpStatus.OK, res, req);
		} catch (error: any) {
			const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = error.message || "Terjadi kesalahan pada server";

			if (message === "User not found") message = "User tidak ditemukan";
			return respons.error(message, null, statusCode, res, req);
		}
	},

	refreshToken: async (req: Request, res: Response) => {
		try {
			const { refreshToken } = req.body;
			if (!refreshToken) {
				return respons.error("Data tidak lengkap", null, HttpStatus.BAD_REQUEST, res, req);
			}

			const user = await authServices.refreshToken(refreshToken);
			return respons.success("Berhasil refresh token", user, HttpStatus.OK, res, req);
		} catch (error: any) {
			const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = error.message || "Terjadi kesalahan pada server";

			if (message === "User not found") message = "User tidak ditemukan";
			return respons.error(message, null, statusCode, res, req);
		}
	},

	profile: async (req: Request, res: Response) => {
		try {
			const user = await authServices.profile(req.user.id);
			return respons.success("Berhasil get profile", user, HttpStatus.OK, res, req);
		} catch (error: any) {
			const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = error.message || "Terjadi kesalahan pada server";

			if (message === "User not found") message = "User tidak ditemukan";
			return respons.error(message, null, statusCode, res, req);
		}
	},

	forgotPassword: async (req: Request, res: Response) => {
		try {
			const email = req.body.email;

			if (!email) {
				return respons.error("Data tidak lengkap", null, HttpStatus.BAD_REQUEST, res, req);
			}
			const result = await authServices.forgotPassword(email);
			return respons.success("Berhasil kirim email", result, HttpStatus.OK, res, req);
		} catch (error: any) {
			const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = error.message || "Terjadi kesalahan pada server";

			if (message === "User not found") message = "User tidak ditemukan";
			return respons.error(message, null, statusCode, res, req);
		}
	},
};
