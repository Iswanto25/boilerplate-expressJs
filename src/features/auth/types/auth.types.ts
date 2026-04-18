import { z } from "zod";
import { authValidation } from "@/features/auth/validations/auth.validation.js";

export type RegisterInput = z.infer<typeof authValidation.register>;
export type LoginInput = z.infer<typeof authValidation.login>;
export type GetUsersQuery = z.infer<typeof authValidation.getUsers>;
export type UpdateProfileInput = z.infer<typeof authValidation.updateProfile>;
