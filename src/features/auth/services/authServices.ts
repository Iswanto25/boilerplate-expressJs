import prisma from "../../../configs/database";
import { existingEmail } from "../../../utils/existingUsers";
import { encryptPassword, comparePassword } from "../../../utils/utils";
import { jwtUtils } from "../../../utils/jwt";
import { storeToken, deleteToken } from "../../../utils/tokenStore";
import { v4 as uuidv4 } from "uuid";

interface LocalRegister {
	name: string;
	email: string;
	password: string;
}

export const authServices = {
	// ========================================
	// REGISTER
	// ========================================
	async register(data: LocalRegister) {
		return await prisma.$transaction(async (tx) => {
			const existing = await existingEmail(data.email);
			if (existing) throw new Error("Email already exists");

			const user = await tx.user.create({
				data: {
					name: data.name,
					email: data.email,
					password: await encryptPassword(data.password),
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

			return {
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
				},
				accessToken,
				refreshToken,
			};
		});
	},

	// ========================================
	// LOGIN
	// ========================================
	async login(email: string, password: string) {
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) throw new Error("User not found");

		const isValid = await comparePassword(password, user.password);
		if (!isValid) throw new Error("Invalid password");

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

		return {
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
			accessToken,
			refreshToken,
		};
	},

	// ========================================
	// REFRESH TOKEN
	// ========================================
	async refreshToken(oldToken: string) {
		const decoded = jwtUtils.verifyRefreshToken(oldToken);

		const user = await prisma.user.findUnique({ where: { id: decoded.id } });
		if (!user) throw new Error("User not found");

		const tokenRecord = await prisma.refreshToken.findFirst({
			where: { userId: user.id, token: oldToken },
		});
		if (!tokenRecord) throw new Error("Refresh token invalid or expired");

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

	// ========================================
	// LOGOUT
	// ========================================
	async logout(userId: string) {
		await prisma.refreshToken.deleteMany({ where: { userId } });
		await deleteToken(userId, "access");
		await deleteToken(userId, "refresh");

		return { message: "Logout berhasil" };
	},

	async profile(userId: string) {
		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user) throw new Error("User not found");
		return user;
	}
};
