import { Router } from "express";
import { authController } from "../features/auth/controllers/authControllers";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authenticate.verifyToken, authController.logout);
router.post("/refresh-token", authController.refreshToken);
router.get("/profile", authenticate.verifyToken, authController.profile);

export default router;
