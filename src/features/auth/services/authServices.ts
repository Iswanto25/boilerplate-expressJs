import { authRepository } from "../repository/authRepository";
import { uploadBase64, getFile, deleteFile } from "../../../utils/s3";
import { apiError } from "../../../utils/respons";
import { jwtUtils } from "../../../utils/jwt";
import { storeToken, deleteToken } from "../../../utils/tokenStore";
import { sendEmail } from "../../../utils/smtp";
import { generateOTP, encryptPassword, comparePassword, isEmailValid, pLimit } from "../../../utils/utils";
import { generateOTPEmail } from "../../../utils/mail";
import crypto from "node:crypto";
import os from "node:os";
import { encryptionUtils, decryptSensitive } from "../../../utils/encryption";
import { logger } from "../../../utils/logger";

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
		return await authRepository.transaction(async (tx) => {
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

	async bulkRegister(users: LocalRegister[]) {
		logger.info(`Starting bulk register for ${users.length} users`);
		const totalStartTime = Date.now();
		const results = {
			total: users.length,
			success: 0,
			failed: 0,
			errors: [] as Array<{ batch: number; error: string }>,
			uploadedPhotos: 0,
			failedPhotos: 0,
		};

		let emailValidationTime = 0;
		let preprocessingTime = 0;
		let databaseInsertionTime = 0;
		const batchTimings: Array<{ batchNum: number; users: number; time: number; status: "success" | "failed"; error?: string }> = [];
		let totalPhotoSizeMB = 0;
		let totalNIKEncryptionTime = 0;
		let nikEncryptionCount = 0;

		const emailValidationStart = Date.now();
		const emails = users.map((u) => u.email);

		const existingUsers = await authRepository.findUsersByEmails(emails);
		const existingEmailSet = new Set(existingUsers.map((u) => u.email));

		emailValidationTime = Date.now() - emailValidationStart;
		logger.info(`1. Email validation: ${emailValidationTime}ms`);

		const preprocessingStart = Date.now();
		const preProcessedUsers = await Promise.allSettled(
			users.map((u) =>
				limit(async () => {
					if (!isEmailValid(u.email)) throw new Error("Invalid email");
					if (existingEmailSet.has(u.email)) throw new Error("Email exists");

					const hashedPassword = await encryptPassword(u.password);
					const userId = crypto.randomUUID();

					let photoFileName: string | null = null;
					let photoSizeMB = 0;
					if (u.photo) {
						try {
							const uploadResult = await uploadBase64("users", u.photo, 5, ["image/jpeg", "image/png", "image/jpg", "image/webp"]);
							photoFileName = uploadResult.fileName;
							results.uploadedPhotos++;

							const base64Length = u.photo.replace(/^data:image\/\w+;base64,/, "").length;
							photoSizeMB = (base64Length * 0.75) / 1024 / 1024;
							totalPhotoSizeMB += photoSizeMB;
						} catch {
							photoFileName = null;
							results.failedPhotos++;
						}
					}

					let encryptedNIK: string | null = null;
					if (u.NIK) {
						const nikEncryptStart = Date.now();
						const { ciphertext } = encryptionUtils.encryptSensitive(u.NIK);
						encryptedNIK = ciphertext;
						totalNIKEncryptionTime += Date.now() - nikEncryptStart;
						nikEncryptionCount++;
					}

					return { ...u, hashedPassword, id: userId, photoFileName, photoSizeMB, encryptedNIK };
				}),
			),
		);
		preprocessingTime = Date.now() - preprocessingStart;
		logger.info(`2. Preprocessing (hash + upload + NIK encrypt): ${preprocessingTime}ms`);

		const validUsers = preProcessedUsers
			.filter((p): p is PromiseFulfilledResult<any> => p.status === "fulfilled")
			.map((p) => p.value as Record<string, any>);
		results.failed += preProcessedUsers.length - validUsers.length;

		const dbInsertionStart = Date.now();
		const batchSize = 250;

		for (let i = 0; i < validUsers.length; i += batchSize) {
			const batch = validUsers.slice(i, i + batchSize);
			const batchNum = Math.floor(i / batchSize) + 1;
			const batchStart = Date.now();

			try {
				await authRepository.transaction(async (tx) => {
					await authRepository.createUsersBatch(
						batch.map((u) => ({
							id: u.id,
							email: u.email,
							password: u.hashedPassword,
						})),
						tx,
					);

					await authRepository.createProfilesBatch(
						batch.map((u) => ({
							userId: u.id,
							name: u.name,
							address: u.address,
							phone: u.phone,
							photo: u.photoFileName,
							NIK: u.encryptedNIK || null,
						})),
						tx,
					);

					results.success += batch.length;
				});
				batchTimings.push({ batchNum, users: batch.length, time: Date.now() - batchStart, status: "success" });
			} catch (dbError) {
				const err = dbError as Error;
				results.failed += batch.length;
				results.errors.push({ batch: batchNum, error: `DB Error: ${err.message}` });
				batchTimings.push({ batchNum, users: batch.length, time: Date.now() - batchStart, status: "failed", error: err.message });
			}
		}
		databaseInsertionTime = Date.now() - dbInsertionStart;
		logger.info(`3. Database insertion: ${databaseInsertionTime}ms`);

		const totalTime = Date.now() - totalStartTime;
		const memUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

		try {
			const { saveBulkRegisterReport } = await import("../../../utils/bulkRegisterReport");
			const metrics = {
				totalUsers: users.length,
				timestamp: new Date().toISOString(),
				emailValidationTime,
				preprocessingTime,
				databaseInsertionTime,
				totalTime,
				successCount: results.success,
				failedCount: results.failed,
				existingEmailsCount: existingEmailSet.size,
				uploadedPhotos: results.uploadedPhotos,
				failedPhotos: results.failedPhotos,
				batchSize,
				totalBatches: Math.ceil(validUsers.length / batchSize),
				batchTimings,
				memoryUsedMB: parseFloat(memUsed),
				averageTimePerUser: totalTime / users.length,
				throughputUsersPerSecond: (users.length / totalTime) * 1000,
				cpuCores: os.cpus().length,
				concurrencyLimit: CONCURRENCY_LIMIT,
				nikEncryptionTime: totalNIKEncryptionTime,
				nikEncryptionCount: nikEncryptionCount,
				averageNIKEncryptTime: nikEncryptionCount > 0 ? totalNIKEncryptionTime / nikEncryptionCount : 0,
				totalDataSizeMB: totalPhotoSizeMB,
				averagePhotoSizeMB: results.uploadedPhotos > 0 ? totalPhotoSizeMB / results.uploadedPhotos : 0,
			};
			await saveBulkRegisterReport(metrics);
		} catch (reportError) {
			logger.error({ err: reportError }, "Failed to generate report");
		}

		return results;
	},

	async login(email: string, password: string) {
		if (!isEmailValid(email)) throw new apiError(400, "Invalid email");

		const user = await authRepository.findUserByEmail(email);
		if (!user) throw new apiError(400, "User not found");

		const isValid = await comparePassword(password, user.password);
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
		return await authRepository.transaction(async (tx) => {
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
		return await authRepository.transaction(async (tx) => {
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
			const { saveGetUsersReport } = await import("../../../utils/getUsersReport");
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
