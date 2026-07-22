import { z } from "zod";
import { uploadValidation } from "@/features/upload/validations/upload.validation.js";

export type PresignedUrlInput = z.infer<typeof uploadValidation.presignedUrl>;
export type ConfirmUploadInput = z.infer<typeof uploadValidation.confirm>;
