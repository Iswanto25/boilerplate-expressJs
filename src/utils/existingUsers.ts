import prisma from "../configs/database";
import { PrismaClient } from "@prisma/client";

export const existingEmail = async (email: string) => {
    return await prisma.user.findUnique({
        where: {
            email,
        },
    });
};