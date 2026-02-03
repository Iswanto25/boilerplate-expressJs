import { Router } from "express";
import { authController } from "../features/auth/controllers/authControllers";
import { authenticate } from "../middlewares/authMiddleware";
import { rateLimiter } from "../utils/rateLimiter";

const router = Router();

router.post("/register", authController.register);
router.post("/bulk-register", authController.bulkRegister);
router.post("/login", authController.login);
router.post("/logout", authenticate.verifyToken, authController.logout);
router.post("/refresh-token", authController.refreshToken);
router.get("/profile", authenticate.verifyToken, rateLimiter({ windowInSeconds: 30, maxRequests: 3, useUserId: true }), authController.profile);
router.post("/forgot-password", authController.forgotPassword);
router.get("/users", authController.getUsers);

export default router;
