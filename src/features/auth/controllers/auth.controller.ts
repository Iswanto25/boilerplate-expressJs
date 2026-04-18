import { Request, Response } from "express";
import { authServices } from "@/features/auth/services/auth.service.js";
import { HttpStatus, respons } from "@/utils/respons.js";
import { authValidation } from "@/features/auth/validations/auth.validation.js";

export const authController = {
	register: async (req: Request, res: Response) => {
		try {
			const validation = authValidation.register.safeParse(req.body);

			if (!validation.success) {
				const errorMsg = validation.error.issues[0]?.message || "Data tidak valid";
				return respons.error(errorMsg, errorMsg, HttpStatus.BAD_REQUEST, res, req);
			}

			const data = validation.data;

			const user = await authServices.register(data);
			return respons.success("Berhasil register", user, HttpStatus.OK, res, req);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = err.message || "Terjadi kesalahan pada server";

			if (message === "Email already exists") message = "Email sudah terdaftar";
			return respons.error(message, message, statusCode, res, req);
		}
	},

	login: async (req: Request, res: Response) => {
		try {
			const validation = authValidation.login.safeParse(req.body);

			if (!validation.success) {
				const errorMsg = validation.error.issues[0]?.message || "Data tidak valid";
				return respons.error(errorMsg, errorMsg, HttpStatus.BAD_REQUEST, res, req);
			}

			const { email, password } = validation.data;

			const user = await authServices.login(email, password);
			return respons.success("Berhasil login", user, HttpStatus.OK, res, req);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = err.message || "Terjadi kesalahan pada server";

			if (message === "User not found") message = "User tidak ditemukan";
			return respons.error(message, message, statusCode, res, req);
		}
	},

	logout: async (req: Request, res: Response) => {
		try {
			if (!req.user) {
				return respons.error("User tidak ditemukan", "User tidak ditemukan", HttpStatus.UNAUTHORIZED, res, req);
			}
			await authServices.logout(req.user.id);
			return respons.success("Berhasil logout", {}, HttpStatus.OK, res, req);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = err.message || "Terjadi kesalahan pada server";

			if (message === "User not found") message = "User tidak ditemukan";
			return respons.error(message, message, statusCode, res, req);
		}
	},

	refreshToken: async (req: Request, res: Response) => {
		try {
			const validation = authValidation.refreshToken.safeParse(req.body.refreshToken);

			if (!validation.success) {
				const errorMsg = validation.error.issues[0]?.message || "Data tidak valid";
				return respons.error(errorMsg, errorMsg, HttpStatus.BAD_REQUEST, res, req);
			}

			const refreshToken = validation.data;

			const user = await authServices.refreshToken(refreshToken);
			return respons.success("Berhasil refresh token", user, HttpStatus.OK, res, req);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = err.message || "Terjadi kesalahan pada server";

			if (message === "User not found") message = "User tidak ditemukan";
			return respons.error(message, message, statusCode, res, req);
		}
	},

	profile: async (req: Request, res: Response) => {
		try {
			if (!req.user) {
				return respons.error("User tidak ditemukan", "User tidak ditemukan", HttpStatus.UNAUTHORIZED, res, req);
			}
			const user = await authServices.profile(req.user.id);
			return respons.success("Berhasil get profile", user, HttpStatus.OK, res, req);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = err.message || "Terjadi kesalahan pada server";

			if (message === "User not found") message = "User tidak ditemukan";
			return respons.error(message, message, statusCode, res, req);
		}
	},

	forgotPassword: async (req: Request, res: Response) => {
		try {
			const validation = authValidation.forgotPassword.safeParse(req.body);

			if (!validation.success) {
				const errorMsg = validation.error.issues[0]?.message || "Data tidak valid";
				return respons.error(errorMsg, errorMsg, HttpStatus.BAD_REQUEST, res, req);
			}
			const { email } = validation.data;
			const result = await authServices.forgotPassword(email);
			return respons.success("Berhasil kirim email", result, HttpStatus.OK, res, req);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			let message = err.message || "Terjadi kesalahan pada server";

			if (message === "User not found") message = "User tidak ditemukan";
			return respons.error(message, message, statusCode, res, req);
		}
	},

	getUsers: async (req: Request, res: Response) => {
		try {
			const validation = authValidation.getUsers.safeParse(req.query);

			if (!validation.success) {
				const errorMsg = validation.error.issues[0]?.message || "Data tidak valid";
				return respons.error(errorMsg, errorMsg, HttpStatus.BAD_REQUEST, res, req);
			}

			const { page, limit, search } = validation.data;

			const { users, pagination } = await authServices.getUsers(page, limit, search);
			return respons.success("Berhasil get users", users, HttpStatus.OK, res, req, pagination);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			const message = err.message || "Terjadi kesalahan pada server";
			return respons.error(message, message, statusCode, res, req);
		}
	},

	updateProfile: async (req: Request, res: Response) => {
		try {
			if (!req.user) {
				return respons.error("User tidak ditemukan", "User tidak ditemukan", HttpStatus.UNAUTHORIZED, res, req);
			}
			const validation = authValidation.updateProfile.safeParse(req.body);
			if (!validation.success) {
				const errorMsg = validation.error.issues[0]?.message || "Data tidak valid";
				return respons.error(errorMsg, errorMsg, HttpStatus.BAD_REQUEST, res, req);
			}

			await authServices.updateProfile(req.user.id, validation.data);
			return respons.success("Berhasil update profile", {}, HttpStatus.OK, res, req);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			const message = err.message || "Terjadi kesalahan pada server";
			return respons.error(message, message, statusCode, res, req);
		}
	},

	deleteProfile: async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (!req.params.id) {
				return respons.error("Id cannot empty", "Id tidak boleh kosong", HttpStatus.BAD_REQUEST, res, req);
			}
			await authServices.deleteProfile(id as string);
			return respons.success("Berhasil menghapus profile", {}, HttpStatus.OK, res, req);
		} catch (error) {
			const err = error as { statusCode?: number; message?: string };
			const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
			const message = err.message || "Terjadi kesalahan pada server";
			return respons.error(message, message, statusCode, res, req);
		}
	},
};
