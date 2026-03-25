import prisma from "@/configs/database.js";
import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export const authRepository = {
	transaction: async <T>(callback: (tx: TxClient) => Promise<T>) => {
		return await prisma.$transaction(callback);
	},

	findUserByEmail: async (email: string, tx: TxClient = prisma) => {
		return await tx.user.findUnique({
			where: { email },
			include: { profile: true },
		});
	},

	findUserById: async (id: string, tx: TxClient = prisma) => {
		return await tx.user.findUnique({
			where: { id },
			select: {
				id: true,
				isActive: true,
				role: true,
				email: true,
				profile: {
					select: {
						name: true,
						NIK: true,
						phone: true,
						photo: true,
						address: true
					}
				}
			}
		});
	},

	findUsersByEmails: async (emails: string[], tx: TxClient = prisma) => {
		return await tx.user.findMany({
			where: { email: { in: emails } },
			select: { email: true },
		});
	},

	createUser: async (data: { email: string; password: string; profile: Prisma.profileCreateWithoutUserInput }, tx: TxClient = prisma) => {
		return await tx.user.create({
			data: {
				email: data.email,
				password: data.password,
				profile: {
					create: data.profile,
				},
			},
			include: { profile: true },
		});
	},

	createRefreshToken: async (data: { id: string; userId: string; token: string }, tx: TxClient = prisma) => {
		return await tx.refreshToken.create({ data });
	},

	deleteRefreshTokensByUserId: async (userId: string, tx: TxClient = prisma) => {
		return await tx.refreshToken.deleteMany({ where: { userId } });
	},

	findRefreshToken: async (userId: string, token: string, tx: TxClient = prisma) => {
		return await tx.refreshToken.findFirst({
			where: { userId, token },
		});
	},

	updateUserProfile: async (userId: string, profileData: Prisma.profileUpdateWithoutUserInput, email?: string, tx: TxClient = prisma) => {
		return await tx.user.update({
			where: { id: userId },
			data: {
				...(email && { email }),
				profile: {
					update: {
						where: { userId: userId },
						data: profileData,
					},
				},
			},
			include: { profile: true },
		});
	},

	deleteUser: async (userId: string, tx: TxClient = prisma) => {
		return await tx.user.delete({
			where: { id: userId },
		});
	},

	getAllUsersWithProfile: async (params: { search?: string; take?: number; skip?: number }, tx: TxClient = prisma) => {
		const { search, take, skip } = params;
		const where: Prisma.userWhereInput = {};

		if (search) {
			where.OR = [
				{ email: { contains: search, mode: "insensitive" } },
				{ profile: { name: { contains: search, mode: "insensitive" } } },
				{ profile: { phone: { contains: search, mode: "insensitive" } } },
				{ profile: { address: { contains: search, mode: "insensitive" } } },
			];
		}

		const [total, users] = await Promise.all([
			tx.user.count({ where }),
			tx.user.findMany({
				where,
				take,
				skip,
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
			}),
		]);
		return { total, users };
	},
};
