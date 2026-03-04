import prisma from "../configs/database";

export const existingEmail = async (email: string) => {
	return await prisma.user.findUnique({
		where: {
			email,
		},
	});
};
