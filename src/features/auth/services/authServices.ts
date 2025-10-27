import prisma from "../../../configs/database";
import { PrismaClient } from "@prisma/client";
import { existingEmail } from "../../../utils/existingUsers";

interface LocalRegister {
    name: string;
    email: string;
    password: string;   
}

export const authServices = {
    async register(data: LocalRegister) {

    }
};
