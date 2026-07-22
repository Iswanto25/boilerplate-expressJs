import { Router } from "express";
import authRoutes from "@/features/auth/auth.routes.js";
import uploadRoutes from "@/features/upload/upload.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/upload", uploadRoutes);

export default router;
