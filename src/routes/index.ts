import { Router } from "express";
import authRoutes from "@/features/auth/auth.routes.js";

const router = Router();

router.use("/auth", authRoutes);

export default router;
