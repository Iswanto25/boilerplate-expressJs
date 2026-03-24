import { authRepository } from "@/features/auth/repository/authRepository.js";
import { uploadBase64, deleteFile, getPublicUrl } from "@/utils/s3.js";
import { apiError } from "@/utils/respons.js";
import { jwtUtils } from "@/utils/jwt.js";
import { storeToken, deleteToken } from "@/utils/tokenStore.js";
import { sendEmail } from "@/utils/smtp.js";
import { generateOTP, encryptPassword, comparePassword, isEmailValid } from "@/utils/utils.js";
import { generateOTPEmail } from "@/utils/mail.js";
import crypto from "node:crypto";
import { encryptionUtils, decryptSensitive } from "@/utils/encryption.js";
import { paginate } from "@/utils/pagination.js";
import { logger } from "@/utils/logger.js";

interface LocalRegister {
	name: string;
	email: string;
	password: string;
	address?: string;
	phone?: string;
	photo?: string;
	NIK?: string;
}

const folder = "profile";

export const authServices = {
	async register(data: LocalRegister) {
		return await authRepository.transaction(async (tx: any) => {
			if (!isEmailValid(data.email)) throw new apiError(400, "Invalid email");

			const existing = await authRepository.findUserByEmail(data.email, tx);
			if (existing) throw new apiError(400, "Email already exists");

			let photoFileName: string | null = null;
			if (data.photo) {
				const uploadResult = await uploadBase64(folder, data.photo, 5, ["image/jpeg", "image/png", "image/jpg", "image/webp"]);
				photoFileName = uploadResult.fileName;
			}

			const hashedPassword = await encryptPassword(data.password);

			const ciphertext = data.NIK ? encryptionUtils.encryptSensitive(data.NIK).ciphertext : null;

			const user = await authRepository.createUser(
				{
					email: data.email,
					password: hashedPassword,
					profile: {
						name: data.name,
						address: data.address,
						phone: data.phone,
						photo: photoFileName,
						NIK: ciphertext,
					},
				},
				tx,
			);

			const accessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
			const refreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

			await Promise.all([
				storeToken(user.id, accessToken, "access", 24 * 60 * 60),
				storeToken(user.id, refreshToken, "refresh", 7 * 24 * 60 * 60),
				authRepository.createRefreshToken(
					{
						id: crypto.randomUUID(),
						userId: user.id,
						token: refreshToken,
					},
					tx,
				),
			]);

			return {
				user: {
					id: user.id,
					name: user.profile?.name || null,
					email: user.email,
					photo: photoFileName,
				},
				accessToken,
				refreshToken,
			};
		});
	},

	async login(email: string, password: string) {
		if (!isEmailValid(email)) throw new apiError(400, "Invalid email");

		const user = await authRepository.findUserByEmail(email);
		if (!user) throw new apiError(400, "User not found");

		const isValid = await comparePassword(password, user.password || "");
		if (!isValid) throw new apiError(400, "Invalid password");

		// Hapus semua token di database dan redis (force single device)
		await Promise.all([authRepository.deleteRefreshTokensByUserId(user.id), deleteToken(user.id, "access"), deleteToken(user.id, "refresh")]);

		const accessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
		const refreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

		await Promise.all([
			authRepository.createRefreshToken({
				id: crypto.randomUUID(),
				userId: user.id,
				token: refreshToken,
			}),
			storeToken(user.id, accessToken, "access", 24 * 60 * 60),
			storeToken(user.id, refreshToken, "refresh", 7 * 24 * 60 * 60),
		]);

		const photoUrl = user.profile?.photo ? getPublicUrl(folder, user.profile.photo) : null;

		return {
			user: {
				id: user.id,
				name: user.profile?.name || null,
				email: user.email,
				photo: photoUrl,
			},
			accessToken,
			refreshToken,
		};
	},

	async refreshToken(oldToken: string) {
		const decoded = jwtUtils.verifyRefreshToken(oldToken);

		const [user, tokenRecord] = await Promise.all([
			authRepository.findUserById(decoded.id),
			authRepository.findRefreshToken(decoded.id, oldToken),
		]);
		if (!user) throw new apiError(400, "User not found");
		if (!tokenRecord) throw new apiError(400, "Invalid token");

		// Hapus semua refresh token dan redis token (disable multi-device)
		await Promise.all([authRepository.deleteRefreshTokensByUserId(user.id), deleteToken(user.id, "access"), deleteToken(user.id, "refresh")]);

		const newAccessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
		const newRefreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

		await Promise.all([
			authRepository.createRefreshToken({
				id: crypto.randomUUID(),
				userId: user.id,
				token: newRefreshToken,
			}),
			storeToken(user.id, newAccessToken, "access", 24 * 60 * 60),
			storeToken(user.id, newRefreshToken, "refresh", 7 * 24 * 60 * 60),
		]);

		return { accessToken: newAccessToken, refreshToken: newRefreshToken };
	},

	async logout(userId: string): Promise<void> {
		await Promise.all([authRepository.deleteRefreshTokensByUserId(userId), deleteToken(userId, "access"), deleteToken(userId, "refresh")]);
		
	},

	async profile(userId: string) {
		const user = await authRepository.findUserById(userId);
		if (!user) throw new apiError(400, "User not found");

		const photoUrl = user.profile?.photo ? getPublicUrl(folder, user.profile.photo) : null;

		return {
			id: user.id,
			email: user.email,
			role: user.role,
			isActive: user.isActive,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			name: user.profile?.name || null,
			phone: user.profile?.phone || null,
			address: user.profile?.address || null,
			photo: photoUrl,
		};
	},

	async forgotPassword(email: string): Promise<void> {
		const user = await authRepository.findUserByEmail(email);
		if (!user) throw new apiError(400, "User not found");

		const otp = generateOTP();
		const userName = user.profile?.name || "User";
		const html = generateOTPEmail(userName, otp);

		await sendEmail({
			to: email,
			subject: "Reset Password",
			html,
			fromName: process.env.APP_NAME,
			fromEmail: process.env.SMTP_USER,
		});
	},

	async updateProfile(userId: string, data: Partial<{ name: string; phone: string; address: string; photo: string }>): Promise<void> {
		await authRepository.transaction(async (tx: any) => {
			const currentUser = await authRepository.findUserById(userId, tx);
			if (!currentUser) throw new apiError(400, "User not found");

			let photoFileName: string | undefined = undefined;
			const oldPhotoFileName = currentUser.profile?.photo;

			if (data.photo) {
				const uploadResult = await uploadBase64(folder, data.photo, 5, ["image/jpeg", "image/png", "image/jpg", "image/webp"]);
				photoFileName = uploadResult.fileName;

				if (oldPhotoFileName) {
					await deleteFile(folder, oldPhotoFileName, { strict: false });
				}
			}

			const profileData = {
				...(data.name !== undefined && { name: data.name }),
				...(data.phone !== undefined && { phone: data.phone }),
				...(data.address !== undefined && { address: data.address }),
				...(photoFileName !== undefined && { photo: photoFileName }),
			};

			await authRepository.updateUserProfile(userId, profileData, tx);
		});
	},

	async deleteProfile(userId: string): Promise<void> {
		await authRepository.transaction(async (tx: any) => {
			const user = await authRepository.findUserById(userId, tx);
			if (!user) throw new apiError(400, "User not found");

			const photoFileName = user.profile?.photo;

			await authRepository.deleteUser(userId, tx);

			if (photoFileName) {
				await deleteFile(folder, photoFileName, { strict: false });
			}

			await deleteToken(userId, "access");
			await deleteToken(userId, "refresh");
		});
	},

	async getUsers(page: number = 1, limit: number = 10, search?: string) {
		const take = limit;
		const skip = (page - 1) * limit;

		const { total: totalData, users } = await authRepository.getAllUsersWithProfile({ search, skip, take });
		const { pagination } = paginate(page, limit, totalData);

		const result = users.map((user) => {
			let decryptedNIK: string | null = null;
			if (user.profile?.NIK) {
				try {
					decryptedNIK = decryptSensitive({ version: 1, ciphertext: user.profile.NIK });
				} catch (error) {
					logger.error({ err: error, userId: user.id }, "Failed to decrypt NIK");
				}
			}

			return {
				id: user.id,
				email: user.email,
				name: user.profile?.name || null,
				phone: user.profile?.phone || null,
				address: user.profile?.address || null,
				photo: user.profile?.photo ? getPublicUrl(folder, user.profile.photo) : null,
				NIK: decryptedNIK,
			};
		});

		return { users: result, pagination };
	},
};
