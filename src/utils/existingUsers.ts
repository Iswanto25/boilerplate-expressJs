import prisma from "../configs/database.js";

export const existingEmail = async (email: string) => {
	return await prisma.user.findUnique({
		where: {
			email,
		},
	});
};
