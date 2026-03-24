import { z } from "zod";

export const authValidation = {
    register: z.object({
        name: z.string().min(1, { error: "Name is required" }),
        email: z.email({ error: "Invalid email format" }),
        password: z.string().min(6, { error: "Password must be at least 6 characters" }),
        address: z.string().optional(),
        phone: z.string().optional(),
        photo: z.string().optional(),
        NIK: z.string().optional(),
    }),

    login: z.object({
        email: z.email({ error: "Invalid email format" }),
        password: z.string().min(1, { error: "Password is required" }),
    }),

    refreshToken: z.object({
        refreshToken: z.string().min(1, { error: "Refresh token is required" }),
    }),

    forgotPassword: z.object({
        email: z.email({ error: "Invalid email format" }),
    }),

    getUsers: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().default(10),
        search: z.string().optional(),
    }),
};

export type RegisterInput = z.infer<typeof authValidation.register>;
export type GetUsersQuery = z.infer<typeof authValidation.getUsers>;