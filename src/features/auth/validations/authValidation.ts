import { z } from "zod";

export const authValidation = {
	register: z.object({
		name: z.string().min(1, { message: "Name is required" }),
		email: z.string().email({ message: "Invalid email format" }),
		password: z
			.string()
			.min(6, { message: "Password must be at least 6 characters" })
			.regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
			.regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
			.regex(/[0-9]/, { message: "Password must contain at least one number" })
			.regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character" }),
		address: z.string().optional(),
		phone: z.string().optional(),
		photo: z.string().optional(),
		NIK: z.string().optional(),
	}),

	login: z.object({
		email: z.string().email({ message: "Invalid email format" }),
		password: z.string().min(1, { message: "Password is required" }),
	}),

	refreshToken: z.string().min(1, { message: "Refresh token is required" }),

	forgotPassword: z.object({
		email: z.string().email({ message: "Invalid email format" }),
	}),

	getUsers: z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().default(10),
		search: z.string().optional(),
	}),
};

export type RegisterInput = z.infer<typeof authValidation.register>;
export type GetUsersQuery = z.infer<typeof authValidation.getUsers>;
