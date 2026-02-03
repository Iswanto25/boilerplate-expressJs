import prisma from "../../../configs/database";
import { existingEmail } from "../../../utils/existingUsers";
import { encryptPassword, comparePassword } from "../../../utils/utils";
import { uploadBase64, getFile, deleteFile } from "../../../utils/s3";
import { apiError } from "../../../utils/respons";
import { jwtUtils } from "../../../utils/jwt";
import { storeToken, deleteToken } from "../../../utils/tokenStore";
import { sendEmail } from "../../../utils/smtp";
import { generateOTP, isPhoneNumberValid, isEmailValid } from "../../../utils/utils";
import { generateOTPEmail } from "../../../utils/mail";
import { v4 as uuidv4 } from "uuid";
import pLimit from "p-limit";

interface LocalRegister {
	name: string;
	email: string;
	password: string;
	address: string;
	phone: string;
	photo: string;
}

const folder = "profile";
const limit = pLimit(10);

export const authServices = {
	async register(data: LocalRegister) {
		return await prisma.$transaction(async (tx) => {
			if (!isEmailValid(data.email)) throw new apiError(400, "Invalid email");
			const existing = await existingEmail(data.email);
			if (existing) throw new apiError(400, "Email already exists");

			// Upload photo to S3 if provided
			let photoFileName: string | null = null;
			if (data.photo) {
				const uploadResult = await uploadBase64(folder, data.photo, 5, ["image/jpeg", "image/png", "image/jpg", "image/webp"]);
				photoFileName = uploadResult.fileName;
			}

			const user = await tx.user.create({
				data: {
					email: data.email,
					password: await encryptPassword(data.password),
					profile: {
						create: {
							name: data.name,
							address: data.address,
							phone: data.phone,
							photo: photoFileName,
						},
					},
				},
				include: {
					profile: true,
				},
			});

			const accessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
			const refreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

			await storeToken(user.id, accessToken, "access", 24 * 60 * 60);
			await storeToken(user.id, refreshToken, "refresh", 7 * 24 * 60 * 60);

			await tx.refreshToken.create({
				data: {
					id: uuidv4(),
					userId: user.id,
					token: refreshToken,
				},
			});

			// Get photo URL
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
		const results = { total: users.length, success: 0, failed: 0, errors: [] as any[] };

		const emails = users.map((u) => u.email);
		const existingUsers = await prisma.user.findMany({
			where: { email: { in: emails } },
			select: { email: true },
		});
		const existingEmailSet = new Set(existingUsers.map((u) => u.email));

		const preProcessedUsers = await Promise.allSettled(
			users.map((u) =>
				limit(async () => {
					if (!isEmailValid(u.email)) throw new Error("Invalid email");
					if (existingEmailSet.has(u.email)) throw new Error("Email exists");

					const hashedPassword = await encryptPassword(u.password);
					return { ...u, hashedPassword, id: uuidv4() };
				}),
			),
		);

		const validUsers = preProcessedUsers.filter((p): p is PromiseFulfilledResult<any> => p.status === "fulfilled").map((p) => p.value);

		const batchSize = 250;
		for (let i = 0; i < validUsers.length; i += batchSize) {
			const batch = validUsers.slice(i, i + batchSize);

			try {
				await prisma.$transaction(async (tx) => {
					await tx.user.createMany({
						data: batch.map((u) => ({
							id: u.id,
							email: u.email,
							password: u.hashedPassword,
						})),
					});

					await tx.profile.createMany({
						data: batch.map((u) => ({
							userId: u.id,
							name: u.name,
							address: u.address,
							phone: u.phone,
						})),
					});

					results.success += batch.length;
				});
			} catch (dbError: any) {
				results.errors.push({ error: `DB Error: ${dbError.message}` });
			}
		}

		return results;
	},

	async login(email: string, password: string) {
		if (!isEmailValid(email)) throw new apiError(400, "Invalid email");
		const user = await prisma.user.findUnique({
			where: { email },
			include: { profile: true },
		});
		if (!user) throw new apiError(400, "User not found");

		const isValid = await comparePassword(password, user.password);
		if (!isValid) throw new apiError(400, "Invalid password");

		await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
		await deleteToken(user.id, "access");
		await deleteToken(user.id, "refresh");

		const accessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
		const refreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

		await prisma.refreshToken.create({
			data: {
				id: uuidv4(),
				userId: user.id,
				token: refreshToken,
			},
		});

		await storeToken(user.id, accessToken, "access", 24 * 60 * 60);
		await storeToken(user.id, refreshToken, "refresh", 7 * 24 * 60 * 60);

		// Get photo URL
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

		const user = await prisma.user.findUnique({ where: { id: decoded.id } });
		if (!user) throw new apiError(400, "User not found");

		const tokenRecord = await prisma.refreshToken.findFirst({
			where: { userId: user.id, token: oldToken },
		});
		if (!tokenRecord) throw new apiError(400, "Invalid token");

		await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
		await deleteToken(user.id, "access");
		await deleteToken(user.id, "refresh");

		const newAccessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
		const newRefreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

		await prisma.refreshToken.create({
			data: { id: uuidv4(), userId: user.id, token: newRefreshToken },
		});
		await storeToken(user.id, newAccessToken, "access", 24 * 60 * 60);
		await storeToken(user.id, newRefreshToken, "refresh", 7 * 24 * 60 * 60);

		return {
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		};
	},

	async logout(userId: string) {
		await prisma.refreshToken.deleteMany({ where: { userId } });
		await deleteToken(userId, "access");
		await deleteToken(userId, "refresh");

		return { message: "Logout berhasil" };
	},

	async profile(userId: string) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				role: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
				profile: {
					select: {
						name: true,
						phone: true,
						address: true,
						photo: true,
					},
				},
			},
		});
		if (!user) throw new apiError(400, "User not found");

		const photoUrl = user.profile?.photo ? await getFile(folder, user.profile.photo) : null;

		return {
			...user,
			name: user.profile?.name || null,
			phone: user.profile?.phone || null,
			address: user.profile?.address || null,
			photo: photoUrl,
		};
	},

	async forgotPassword(email: string): Promise<void> {
		const user = await prisma.user.findUnique({
			where: { email },
			include: { profile: true },
		});
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
		return await prisma.$transaction(async (tx) => {
			const currentUser = await tx.user.findUnique({
				where: { id: userId },
				include: { profile: true },
			});

			if (!currentUser) throw new apiError(400, "User not found");

			let photoFileName: string | null | undefined = undefined;
			let oldPhotoFileName: string | null = currentUser.profile?.photo || null;

			if (data.photo) {
				const uploadResult = await uploadBase64(folder, data.photo, 5, ["image/jpeg", "image/png", "image/jpg", "image/webp"]);
				photoFileName = uploadResult.fileName;

				if (oldPhotoFileName) {
					await deleteFile(folder, oldPhotoFileName, { strict: false });
				}
			}

			const updatedUser = await tx.user.update({
				where: { id: userId },
				data: {
					profile: {
						update: {
							where: { userId: userId },
							data: {
								...(data.name !== undefined && { name: data.name }),
								...(data.phone !== undefined && { phone: data.phone }),
								...(data.address !== undefined && { address: data.address }),
								...(photoFileName !== undefined && { photo: photoFileName }),
							},
						},
					},
				},
				include: {
					profile: true,
				},
			});

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
		return await prisma.$transaction(async (tx) => {
			const user = await tx.user.findUnique({
				where: { id: userId },
				include: { profile: true },
			});

			if (!user) throw new apiError(400, "User not found");

			const photoFileName = user.profile?.photo;

			await tx.user.delete({
				where: { id: userId },
			});

			if (photoFileName) {
				await deleteFile(folder, photoFileName, { strict: false });
			}

			await deleteToken(userId, "access");
			await deleteToken(userId, "refresh");

			return { message: "Profile deleted successfully" };
		});
	},
};
