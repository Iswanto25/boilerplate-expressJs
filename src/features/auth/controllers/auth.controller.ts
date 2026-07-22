import { Request, Response } from "express";
import { authServices } from "@/features/auth/services/auth.service.js";
import { HttpStatus, respons, validateOrThrow } from "@/utils/respons.js";
import { authValidation } from "@/features/auth/validations/auth.validation.js";

export const authController = {
	register: async (req: Request, res: Response) => {
		const data = validateOrThrow(authValidation.register, req.body);
		const result = await authServices.register(data);
		return respons.success("Berhasil register", result, HttpStatus.OK, res, req);
	},

	login: async (req: Request, res: Response) => {
		const data = validateOrThrow<{ email: string; password: string }>(authValidation.login, req.body);
		const result = await authServices.login(data.email, data.password);
		return respons.success("Berhasil login", result, HttpStatus.OK, res, req);
	},

	logout: async (req: Request, res: Response) => {
		const result = await authServices.logout(req.user!.id);
		return respons.success("Berhasil logout", result, HttpStatus.OK, res, req);
	},

	refreshToken: async (req: Request, res: Response) => {
		const refreshToken = validateOrThrow<string>(authValidation.refreshToken, req.body.refreshToken);
		const result = await authServices.refreshToken(refreshToken);
		return respons.success("Berhasil refresh token", result, HttpStatus.OK, res, req);
	},

	profile: async (req: Request, res: Response) => {
		const result = await authServices.profile(req.user!.id);
		return respons.success("Berhasil get profile", result, HttpStatus.OK, res, req);
	},

	forgotPassword: async (req: Request, res: Response) => {
		const data = validateOrThrow<{ email: string }>(authValidation.forgotPassword, req.body);
		const result = await authServices.forgotPassword(data.email);
		return respons.success("Berhasil kirim email", result, HttpStatus.OK, res, req);
	},

	sendOtp: async (req: Request, res: Response) => {
		const data = validateOrThrow(authValidation.sendOtp, { ...req.body, ...req.query });
		const result = await authServices.sendOtp(data);
		return respons.success("OTP berhasil dikirim ke email", result, HttpStatus.OK, res, req);
	},

	verifyOtp: async (req: Request, res: Response) => {
		const data = validateOrThrow(authValidation.verifyOtp, req.body);
		const result = await authServices.verifyOtp(data);
		return respons.success("OTP berhasil diverifikasi", result, HttpStatus.OK, res, req);
	},

	resetPassword: async (req: Request, res: Response) => {
		const data = validateOrThrow(authValidation.resetPassword, { token: req.query.token, ...req.body });
		const result = await authServices.resetPassword(data);
		return respons.success("Password berhasil diubah", result, HttpStatus.OK, res, req);
	},

	getUsers: async (req: Request, res: Response) => {
		const page = Number(req.query.page || 1);
		const limit = Number(req.query.limit || 10);
		const search = req.query.search as string;
		const result = await authServices.getUsers(page, limit, search);
		return respons.success("Berhasil get users", result, HttpStatus.OK, res, req);
	},

	updateProfile: async (req: Request, res: Response) => {
		const data = validateOrThrow(authValidation.updateProfile, req.body);
		const result = await authServices.updateProfile(req.user!.id, data);
		return respons.success("Berhasil update profile", result, HttpStatus.OK, res, req);
	},

	deleteProfile: async (req: Request, res: Response) => {
		const id = req.params.id;
		if (!id) {
			return respons.error("Id tidak boleh kosong", "Id cannot empty", HttpStatus.BAD_REQUEST, res, req);
		}
		if (req.user!.id !== id && req.user!.roleName !== "Superadmin") {
			return respons.error("Anda tidak memiliki akses untuk menghapus profil ini", "Forbidden", HttpStatus.FORBIDDEN, res, req);
		}
		await authServices.deleteProfile(id);
		return respons.success("Berhasil menghapus profile", {}, HttpStatus.OK, res, req);
	},

	updatePhoto: async (req: Request, res: Response) => {
		if (!req.file) {
			return respons.error("File foto wajib diunggah", "File foto wajib diunggah", HttpStatus.BAD_REQUEST, res, req);
		}
		const result = await authServices.updatePhoto(req.user!.id, req.file);
		return respons.success("Berhasil update foto profil", result, HttpStatus.OK, res, req);
	},

	updatePhotoDirect: async (req: Request, res: Response) => {
		const { contentType } = validateOrThrow<{ contentType?: string }>(authValidation.updatePhotoDirect, req.body);
		const result = await authServices.updatePhotoDirect(req.user!.id, contentType);
		return respons.success("Berhasil update foto profil", result, HttpStatus.OK, res, req);
	},
};
