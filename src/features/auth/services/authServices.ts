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
import os from "os";
import { encryptionUtils, decryptSensitive } from "../../../utils/encryption";

interface LocalRegister {
	name: string;
	email: string;
	password: string;
	address: string;
	phone: string;
	photo: string;
	NIK?: string; // Optional NIK field
}

const folder = "profile";
const CONCURRENCY_LIMIT = 20;
const limit = pLimit(CONCURRENCY_LIMIT);

export const authServices = {
	async register(data: LocalRegister) {
		return await prisma.$transaction(async (tx) => {
			if (!isEmailValid(data.email)) throw new apiError(400, "Invalid email");
			const existing = await existingEmail(data.email);
			if (existing) throw new apiError(400, "Email already exists");

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
		// 🔍 PROFILING: Start total time
		console.log(`\n🚀 Starting bulk register for ${users.length} users`);
		const totalStartTime = Date.now();
		const results = { total: users.length, success: 0, failed: 0, errors: [] as any[], uploadedPhotos: 0, failedPhotos: 0 };

		// 📊 Metrics collection
		let emailValidationTime = 0;
		let preprocessingTime = 0;
		let databaseInsertionTime = 0;
		const batchTimings: Array<{ batchNum: number; users: number; time: number; status: "success" | "failed"; error?: string }> = [];
		let totalPhotoSizeMB = 0;
		let totalNIKEncryptionTime = 0;
		let nikEncryptionCount = 0;

		// 🔍 PROFILING: Email validation
		console.time("⏱️  1. Email validation");
		const emailValidationStart = Date.now();
		const emails = users.map((u) => u.email);
		const existingUsers = await prisma.user.findMany({
			where: { email: { in: emails } },
			select: { email: true },
		});
		const existingEmailSet = new Set(existingUsers.map((u) => u.email));
		emailValidationTime = Date.now() - emailValidationStart;
		console.timeEnd("⏱️  1. Email validation");
		console.log(`   ℹ️  Found ${existingEmailSet.size} existing emails`);

		// 🔍 PROFILING: Preprocessing (password hashing + photo upload + NIK encryption)
		console.time("⏱️  2. Preprocessing (hash + upload + NIK encrypt)");
		const preprocessingStart = Date.now();
		const preProcessedUsers = await Promise.allSettled(
			users.map((u) =>
				limit(async () => {
					if (!isEmailValid(u.email)) throw new Error("Invalid email");
					if (existingEmailSet.has(u.email)) throw new Error("Email exists");

					const hashedPassword = await encryptPassword(u.password);
					const userId = uuidv4();

					let photoFileName: string | null = null;
					let photoSizeMB = 0;
					if (u.photo) {
						try {
							const uploadResult = await uploadBase64(folder, u.photo, 5, ["image/jpeg", "image/png", "image/jpg", "image/webp"]);
							photoFileName = uploadResult.fileName;
							results.uploadedPhotos++;

							// Estimate photo size from base64
							const base64Length = u.photo.replace(/^data:image\/\w+;base64,/, "").length;
							photoSizeMB = (base64Length * 0.75) / 1024 / 1024; // base64 to bytes to MB
							totalPhotoSizeMB += photoSizeMB;
						} catch (uploadError: any) {
							photoFileName = null;
							results.failedPhotos++;
						}
					}

					// 🔍 PROFILING: NIK Encryption
					let encryptedNIK: string | null = null;
					if (u.NIK) {
						const nikEncryptStart = Date.now();
						const { ciphertext } = encryptionUtils.encryptSensitive(u.NIK);
						encryptedNIK = ciphertext;
						const nikEncryptTime = Date.now() - nikEncryptStart;
						totalNIKEncryptionTime += nikEncryptTime;
						nikEncryptionCount++;
					}

					return { ...u, hashedPassword, id: userId, photoFileName, photoSizeMB, encryptedNIK };
				}),
			),
		);
		preprocessingTime = Date.now() - preprocessingStart;
		console.timeEnd("⏱️  2. Preprocessing (hash + upload + NIK encrypt)");

		const validUsers = preProcessedUsers.filter((p): p is PromiseFulfilledResult<any> => p.status === "fulfilled").map((p) => p.value);
		console.log(`   ✅ Valid users: ${validUsers.length} | ❌ Failed: ${preProcessedUsers.length - validUsers.length}`);
		console.log(`   📸 Photos uploaded: ${results.uploadedPhotos} | Failed: ${results.failedPhotos}`);
		if (nikEncryptionCount > 0) {
			const avgNIKEncrypt = (totalNIKEncryptionTime / nikEncryptionCount).toFixed(3);
			console.log(`   🔐 NIK encrypted: ${nikEncryptionCount} | Avg time: ${avgNIKEncrypt}ms | Total: ${totalNIKEncryptionTime}ms`);
		}

		const failedCount = preProcessedUsers.length - validUsers.length;
		if (failedCount > 0) {
			console.log(`\n   ⚠️  Debugging ${failedCount} failed users...`);
			const failedSamples = preProcessedUsers.filter((p) => p.status === "rejected").slice(0, 5);
			failedSamples.forEach((f: any, idx) => {
				const errMsg = f.reason?.message || String(f.reason);
				console.log(`   ${idx + 1}. ${errMsg}`);
			});
		}

		// 🔍 PROFILING: Database batch insert
		console.time("⏱️  3. Database insertion");
		const dbInsertionStart = Date.now();
		const batchSize = 250;
		for (let i = 0; i < validUsers.length; i += batchSize) {
			const batch = validUsers.slice(i, i + batchSize);
			const batchNum = Math.floor(i / batchSize) + 1;
			const totalBatches = Math.ceil(validUsers.length / batchSize);

			console.log(`   📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} users)`);
			const batchStart = Date.now();

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
							photo: u.photoFileName,
							NIK: u.encryptedNIK || null,
						})),
					});

					results.success += batch.length;
				});
				const batchTime = Date.now() - batchStart;
				batchTimings.push({ batchNum, users: batch.length, time: batchTime, status: "success" });
				console.log(`   ✅ Batch ${batchNum} completed in ${batchTime}ms`);
			} catch (dbError: any) {
				const batchTime = Date.now() - batchStart;
				results.failed += batch.length;
				results.errors.push({ batch: batchNum, error: `DB Error: ${dbError.message}` });
				batchTimings.push({ batchNum, users: batch.length, time: batchTime, status: "failed", error: dbError.message });
				console.log(`   ❌ Batch ${batchNum} failed in ${batchTime}ms: ${dbError.message}`);
			}
		}
		databaseInsertionTime = Date.now() - dbInsertionStart;
		console.timeEnd("⏱️  3. Database insertion");

		const totalTime = Date.now() - totalStartTime;
		const memUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
		console.log(`\n✅ Bulk register completed in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
		console.log(`📊 Success: ${results.success} | Failed: ${results.failed} | Memory used: ${memUsed} MB\n`);

		// 📄 Generate and save markdown report
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
		} catch (reportError: any) {
			console.error("❌ Failed to generate report:", reportError.message);
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

	async getUsers() {
		// 🔍 PROFILING: Start total time
		console.log(`\n🚀 Starting get all users`);
		const totalStartTime = Date.now();
		const memStart = process.memoryUsage().heapUsed / 1024 / 1024;

		// 🔍 PROFILING: Database query
		console.time("⏱️  1. Database query");
		const queryStart = Date.now();
		const users = await prisma.user.findMany({
			select: {
				id: true,
				email: true,
				profile: {
					select: {
						name: true,
						phone: true,
						address: true,
						photo: true,
						NIK: true,
					},
				},
			},
		});
		const queryTime = Date.now() - queryStart;
		console.timeEnd("⏱️  1. Database query");
		console.log(`   📊 Retrieved ${users.length} users`);

		// 🔍 PROFILING: URL generation
		console.time("⏱️  2. URL generation");
		const urlGenStart = Date.now();
		const baseUrl = `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET_NAME}/${folder}`;

		let usersWithPhoto = 0;
		let usersWithoutPhoto = 0;
		let totalNIKDecryptionTime = 0;
		let nikDecryptionCount = 0;

		const result = users.map((user) => {
			if (user.profile?.photo) {
				usersWithPhoto++;
			} else {
				usersWithoutPhoto++;
			}

			let decryptedNIK: string | null = null;
			if (user.profile?.NIK) {
				const nikDecryptStart = Date.now();
				try {
					decryptedNIK = decryptSensitive({ version: 1, ciphertext: user.profile.NIK });
					const nikDecryptTime = Date.now() - nikDecryptStart;
					totalNIKDecryptionTime += nikDecryptTime;
					nikDecryptionCount++;
				} catch (error) {
					console.error(`Failed to decrypt NIK for user ${user.id}:`, error);
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
		console.timeEnd("⏱️  2. URL generation");

		// Log NIK decryption metrics
		if (nikDecryptionCount > 0) {
			const avgNIKDecrypt = (totalNIKDecryptionTime / nikDecryptionCount).toFixed(3);
			console.log(`   🔓 NIK decrypted: ${nikDecryptionCount} | Avg time: ${avgNIKDecrypt}ms | Total: ${totalNIKDecryptionTime}ms`);
		}

		const totalTime = Date.now() - totalStartTime;
		const memEnd = process.memoryUsage().heapUsed / 1024 / 1024;
		const memUsed = memEnd - memStart;

		console.log(`\n✅ Get all users completed in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
		console.log(`📊 Users with photo: ${usersWithPhoto} | Without photo: ${usersWithoutPhoto}`);
		console.log(`💾 Memory used: ${memUsed.toFixed(2)} MB\n`);

		// 📄 Generate and save markdown report
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
		} catch (reportError: any) {
			console.error("❌ Failed to generate report:", reportError.message);
		}

		return result;
	},
};
