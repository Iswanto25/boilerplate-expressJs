import crypto from "node:crypto";
import fs from "node:fs";
import { authRepository } from "@/features/auth/repositories/auth.repository.js";
import { deleteFile, getPublicUrl, getPresignedUploadUrl } from "@/utils/s3.js";
import { apiError } from "@/utils/respons.js";
import { authQueue } from "@/features/auth/jobs/auth.jobs.js";
import { jwtUtils } from "@/utils/jwt.js";
import { storeToken, deleteToken, getStoredToken } from "@/utils/tokenStore.js";
import { redisState } from "@/configs/redis.js";
import { encryptPassword, comparePassword, isEmailValid } from "@/utils/utils.js";
import { encryptionUtils, decryptSensitive } from "@/utils/encryption.js";
import { paginate } from "@/utils/pagination.js";
import { logger } from "@/utils/logger.js";
import { RegisterInput, UpdateProfileInput, ResetPasswordInput, SendOtpInput, VerifyOtpInput } from "@/features/auth/types/auth.types.js";

const folder = "profile";

export const authServices = {
	async register(data: RegisterInput) {
		const result = await authRepository.transaction(async (tx: any) => {
			if (!isEmailValid(data.email)) throw new apiError(400, "Invalid email");

			const existing = await authRepository.findUserByEmail(data.email, tx);
			if (existing) throw new apiError(400, "Email already exists");

			const hashedPassword = await encryptPassword(data.password);

			const ciphertext = data.NIK ? encryptionUtils.encryptSensitive(data.NIK).ciphertext : null;

			const defaultRole = await tx.role.findUnique({ where: { name: "USER" } });
			if (!defaultRole) throw new apiError(500, "Default role 'USER' not found");

			const user = await authRepository.createUser(
				{
					email: data.email,
					password: hashedPassword,
					roleId: defaultRole.id,
					profile: {
						name: data.name,
						address: data.address,
						phone: data.phone,
						photo: null,
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
			]);

			return {
				user: {
					id: user.id,
					name: data.name || null,
					email: user.email,
				},
				accessToken,
				refreshToken,
			};
		});

		if (data.photo) {
			await authQueue.add("upload-profile-photo", {
				base64Data: data.photo,
				folder,
				maxSizeMB: 5,
				allowedFormats: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
				userId: result.user.id,
			});
		}

		return result;
	},

	async login(email: string, password: string) {
		if (!isEmailValid(email)) throw new apiError(400, "Invalid email");

		const user = await authRepository.findUserByEmail(email);
		if (!user) throw new apiError(400, "User not found");

		const isValid = await comparePassword(password, user.password || "");
		if (!isValid) throw new apiError(400, "Invalid password");

		await Promise.all([deleteToken(user.id, "access"), deleteToken(user.id, "refresh")]);

		const accessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
		const refreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

		await Promise.all([storeToken(user.id, accessToken, "access", 24 * 60 * 60), storeToken(user.id, refreshToken, "refresh", 7 * 24 * 60 * 60)]);

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

		const user = await authRepository.findUserById(decoded.id);
		if (!user) throw new apiError(400, "User not found");

		const tokenRecord = await getStoredToken(user.id, "refresh");
		if (!tokenRecord || tokenRecord !== oldToken) throw new apiError(400, "Invalid token");

		await Promise.all([deleteToken(user.id, "access"), deleteToken(user.id, "refresh")]);

		const newAccessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
		const newRefreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

		await Promise.all([
			storeToken(user.id, newAccessToken, "access", 24 * 60 * 60),
			storeToken(user.id, newRefreshToken, "refresh", 7 * 24 * 60 * 60),
		]);

		return { accessToken: newAccessToken, refreshToken: newRefreshToken };
	},

	async logout(userId: string): Promise<void> {
		await Promise.all([deleteToken(userId, "access"), deleteToken(userId, "refresh")]);
	},

	async profile(userId: string) {
		const user = await authRepository.findUserById(userId);
		if (!user) throw new apiError(400, "User not found");

		const photoUrl = user.profile?.photo ? getPublicUrl(folder, user.profile.photo) : null;

		return {
			id: user.id,
			NIK: user.profile?.NIK ? decryptSensitive({ version: 1, ciphertext: user.profile.NIK }) : null,
			email: user.email,
			role: (user as any).role?.name || null,
			isActive: user.isActive,
			name: user.profile?.name || null,
			phone: user.profile?.phone || null,
			address: user.profile?.address || null,
			photo: photoUrl,
		};
	},

	async sendOtp(input: SendOtpInput): Promise<void> {
		const user = await authRepository.findUserByEmail(input.email);
		if (!user) throw new apiError(400, "User not found");

		const otp = crypto.randomInt(100000, 999999).toString();

		const OTP_EXPIRE_SECONDS = 300;
		await storeToken(user.id, otp, "otp", OTP_EXPIRE_SECONDS);

		await authQueue.add("send-otp-email", {
			email: input.email,
			userName: user.profile?.name || "User",
			otp,
			purpose: input.type
		});
	},

	async verifyOtp(input: VerifyOtpInput): Promise<void> {
		const user = await authRepository.findUserByEmail(input.email);
		if (!user) throw new apiError(400, "User not found");

		const storedOtp = await getStoredToken(user.id, "otp");
		if (!storedOtp) throw new apiError(400, "OTP tidak valid atau sudah kedaluwarsa");

		if (storedOtp !== input.otp) throw new apiError(400, "OTP tidak valid");

		await deleteToken(user.id, "otp");
	},

	async forgotPassword(email: string): Promise<void> {
		const user = await authRepository.findUserByEmail(email);
		if (!user) throw new apiError(400, "User not found");

		const token = crypto.randomBytes(32).toString("hex");
		const userName = user.profile?.name || "User";

		if (redisState.isAvailable && redisState.client) {
			await redisState.client.set(`reset_token:${token}`, user.id, "EX", 900);
		} else {
			logger.warn("Redis not available - cannot store reset token");
			return;
		}

		const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || "http://localhost:3000";
		const resetLink = `${frontendUrl}/reset-password?token=${token}`;

		await authQueue.add("send-forgot-password-email", {
			email,
			userName,
			resetLink,
		});
	},

	async resetPassword(input: ResetPasswordInput): Promise<void> {
		if (!redisState.isAvailable || !redisState.client) {
			logger.warn("Redis not available - cannot verify reset token");
			throw new apiError(500, "Terjadi kesalahan pada server");
		}

		const userId = await redisState.client.get(`reset_token:${input.token}`);
		if (!userId) throw new apiError(400, "Token tidak valid atau sudah kedaluwarsa");

		const hashedPassword = await encryptPassword(input.password);

		await authRepository.updateUserPassword(userId, hashedPassword);

		await redisState.client.del(`reset_token:${input.token}`);
	},

	async updateProfile(userId: string, data: UpdateProfileInput): Promise<void> {
		const currentUser = await authRepository.findUserById(userId);
		if (!currentUser) throw new apiError(400, "User not found");

		await authRepository.transaction(async (tx: any) => {
			let encryptNik: string | undefined = undefined;
			if (data.NIK) {
				encryptNik = encryptionUtils.encryptSensitive(data.NIK).ciphertext;
			}

			let newEmail: string | undefined = undefined;
			if (data.email && data.email !== currentUser.email) {
				if (!isEmailValid(data.email)) throw new apiError(400, "Invalid email format");
				const existing = await authRepository.findUserByEmail(data.email, tx);
				if (existing) throw new apiError(400, "Email already exists");
				newEmail = data.email;
			}

			const profileData = {
				...(data.name !== undefined && { name: data.name }),
				...(data.phone !== undefined && { phone: data.phone }),
				...(data.address !== undefined && { address: data.address }),
				...(encryptNik !== undefined && { NIK: encryptNik }),
			};

			await authRepository.updateUserProfile(userId, profileData, newEmail, tx);
		});
	},

	async updatePhoto(userId: string, file: Express.Multer.File): Promise<void> {
		const currentUser = await authRepository.findUserById(userId);
		if (!currentUser) throw new apiError(400, "User not found");

		const oldPhotoFileName = currentUser.profile?.photo || undefined;

		const fileBuffer = await fs.promises.readFile(file.path);
		const base64Data = `data:${file.mimetype};base64,${fileBuffer.toString("base64")}`;

		await authQueue.add("upload-profile-photo", {
			base64Data,
			folder,
			maxSizeMB: 5,
			allowedFormats: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
			userId,
			oldPhotoFileName,
		});

		await fs.promises.unlink(file.path).catch((err) => {
			logger.warn({ err, path: file.path }, "Failed to delete temp file after queuing");
		});
	},

	async updatePhotoDirect(userId: string, contentType?: string): Promise<{ presignedUrl: string; fileName: string; publicUrl: string }> {
		const currentUser = await authRepository.findUserById(userId);
		if (!currentUser) throw new apiError(400, "User not found");

		const ext = contentType ? contentType.split("/")[1] || "jpg" : "jpg";
		const { url, key, publicUrl } = await getPresignedUploadUrl(folder, {
			contentType: contentType || "image/jpeg",
			fileExtension: ext,
			expiresIn: 3600,
		});

		const fileName = key.replace(`${folder}/`, "");

		await authRepository.updateUserProfile(userId, { photo: fileName });

		return { presignedUrl: url, fileName, publicUrl };
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
