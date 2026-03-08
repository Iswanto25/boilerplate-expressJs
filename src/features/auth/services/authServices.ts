import { authRepository } from "@/features/auth/repository/authRepository.js";
import { uploadBase64, getFile, deleteFile } from "@/utils/s3.js";
import { apiError } from "@/utils/respons.js";
import { jwtUtils } from "@/utils/jwt.js";
import { storeToken, deleteToken } from "@/utils/tokenStore.js";
import { sendEmail } from "@/utils/smtp.js";
import { generateOTP, encryptPassword, comparePassword, isEmailValid, pLimit } from "@/utils/utils.js";
import { generateOTPEmail } from "@/utils/mail.js";
import crypto from "node:crypto";
import os from "node:os";
import { encryptionUtils, decryptSensitive } from "@/utils/encryption.js";
import { logger } from "@/utils/logger.js";

interface LocalRegister {
	name: string;
	email: string;
	password: string;
	address: string;
	phone: string;
	photo: string;
	NIK?: string;
}

const folder = "profile";
const CONCURRENCY_LIMIT = 20;
const limit = pLimit(CONCURRENCY_LIMIT);

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

			const user = await authRepository.createUser(
				{
					email: data.email,
					password: hashedPassword,
					profile: {
						name: data.name,
						address: data.address,
						phone: data.phone,
						photo: photoFileName,
					},
				},
				tx,
			);

			const accessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
			const refreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

			await storeToken(user.id, accessToken, "access", 24 * 60 * 60);
			await storeToken(user.id, refreshToken, "refresh", 7 * 24 * 60 * 60);

			await authRepository.createRefreshToken(
				{
					id: crypto.randomUUID(),
					userId: user.id,
					token: refreshToken,
				},
				tx,
			);

			const photoUrl = user.profile?.photo ? await getFile(folder, user.profile.photo) : null;

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
		});
	},


	async login(email: string, password: string) {
		if (!isEmailValid(email)) throw new apiError(400, "Invalid email");

		const user = await authRepository.findUserByEmail(email);
		if (!user) throw new apiError(400, "User not found");

		const isValid = await comparePassword(password, user.password || "");
		if (!isValid) throw new apiError(400, "Invalid password");

		await authRepository.deleteRefreshTokensByUserId(user.id);
		await deleteToken(user.id, "access");
		await deleteToken(user.id, "refresh");

		const accessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
		const refreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

		await authRepository.createRefreshToken({
			id: crypto.randomUUID(),
			userId: user.id,
			token: refreshToken,
		});

		await storeToken(user.id, accessToken, "access", 24 * 60 * 60);
		await storeToken(user.id, refreshToken, "refresh", 7 * 24 * 60 * 60);

		const photoUrl = user.profile?.photo ? await getFile(folder, user.profile.photo) : null;

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

		const user = await authRepository.findUserById(decoded.id);
		if (!user) throw new apiError(400, "User not found");

		const tokenRecord = await authRepository.findRefreshToken(user.id, oldToken);
		if (!tokenRecord) throw new apiError(400, "Invalid token");

		await authRepository.deleteRefreshTokensByUserId(user.id);
		await deleteToken(user.id, "access");
		await deleteToken(user.id, "refresh");

		const newAccessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
		const newRefreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

		await authRepository.createRefreshToken({
			id: crypto.randomUUID(),
			userId: user.id,
			token: newRefreshToken,
		});

		await storeToken(user.id, newAccessToken, "access", 24 * 60 * 60);
		await storeToken(user.id, newRefreshToken, "refresh", 7 * 24 * 60 * 60);

		return { accessToken: newAccessToken, refreshToken: newRefreshToken };
	},

	async logout(userId: string) {
		await authRepository.deleteRefreshTokensByUserId(userId);
		await deleteToken(userId, "access");
		await deleteToken(userId, "refresh");

		return { message: "Logout berhasil" };
	},

	async profile(userId: string) {
		const user = await authRepository.findUserById(userId);
		if (!user) throw new apiError(400, "User not found");

		const photoUrl = user.profile?.photo ? await getFile(folder, user.profile.photo) : null;

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

	async updateProfile(userId: string, data: Partial<{ name: string; phone: string; address: string; photo: string }>) {
		return await authRepository.transaction(async (tx: any) => {
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

			const updatedUser = await authRepository.updateUserProfile(userId, profileData, tx);
			const photoUrl = updatedUser.profile?.photo ? await getFile(folder, updatedUser.profile.photo) : null;

			return {
				id: updatedUser.id,
				email: updatedUser.email,
				name: updatedUser.profile?.name || null,
				phone: updatedUser.profile?.phone || null,
				address: updatedUser.profile?.address || null,
				photo: photoUrl,
			};
		});
	},

	async deleteProfile(userId: string) {
		return await authRepository.transaction(async (tx: any) => {
			const user = await authRepository.findUserById(userId, tx);
			if (!user) throw new apiError(400, "User not found");

			const photoFileName = user.profile?.photo;

			await authRepository.deleteUser(userId, tx);

			if (photoFileName) {
				await deleteFile(folder, photoFileName, { strict: false });
			}

			await deleteToken(userId, "access");
			await deleteToken(userId, "refresh");

			return { message: "Profile deleted successfully" };
		});
	},

	async getUsers() {
		logger.info(`Starting get all users`);
		const totalStartTime = Date.now();
		const memStart = process.memoryUsage().heapUsed / 1024 / 1024;

		const queryStart = Date.now();

		const users = await authRepository.getAllUsersWithProfile();

		const queryTime = Date.now() - queryStart;
		logger.info(`1. Database query: ${queryTime}ms`);

		const urlGenStart = Date.now();
		const baseUrl = `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET_NAME}/${folder}`;

		let usersWithPhoto = 0;
		let usersWithoutPhoto = 0;
		let totalNIKDecryptionTime = 0;
		let nikDecryptionCount = 0;

		const result = users.map((user) => {
			if (user.profile?.photo) usersWithPhoto++;
			else usersWithoutPhoto++;

			let decryptedNIK: string | null = null;
			if (user.profile?.NIK) {
				const nikDecryptStart = Date.now();
				try {
					decryptedNIK = decryptSensitive({ version: 1, ciphertext: user.profile.NIK });
					totalNIKDecryptionTime += Date.now() - nikDecryptStart;
					nikDecryptionCount++;
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
				photo: user.profile?.photo ? `${baseUrl}/${user.profile.photo}` : null,
				NIK: decryptedNIK,
			};
		});
		const urlGenerationTime = Date.now() - urlGenStart;
		logger.info(`2. URL generation: ${urlGenerationTime}ms`);

		const totalTime = Date.now() - totalStartTime;
		const memUsed = process.memoryUsage().heapUsed / 1024 / 1024 - memStart;

		try {
			const { saveGetUsersReport } = await import("@/utils/getUsersReport.js");
			const metrics = {
				timestamp: new Date().toISOString(),
				totalUsers: users.length,
				queryTime,
				urlGenerationTime,
				totalTime,
				usersWithPhoto,
				usersWithoutPhoto,
				memoryUsedMB: memUsed,
				cpuCores: os.cpus().length,
				averageTimePerUser: totalTime / users.length,
				throughputUsersPerSecond: (users.length / totalTime) * 1000,
				nikDecryptionTime: totalNIKDecryptionTime,
				nikDecryptionCount: nikDecryptionCount,
				averageNIKDecryptTime: nikDecryptionCount > 0 ? totalNIKDecryptionTime / nikDecryptionCount : 0,
			};
			await saveGetUsersReport(metrics);
		} catch (reportError) {
			logger.error({ err: reportError }, "Failed to generate report");
		}

		return result;
	},
};
