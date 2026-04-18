import { Router } from "express";
import authRoutes from "@/features/auth/auth.routes.js";
import fileRoutes from "@/features/file/file.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/files", fileRoutes);

export default router;
