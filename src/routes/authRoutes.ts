import { Router } from "express";
import { authController } from "../features/auth/controllers/authControllers.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { rateLimiter } from "../utils/rateLimiter.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authenticate.verifyToken, authController.logout);
router.post("/refresh-token", authenticate.verifyToken, authController.refreshToken);
router.get("/profile", authenticate.verifyToken, rateLimiter({ windowInSeconds: 30, maxRequests: 3, useUserId: true }), authController.profile);
router.post("/forgot-password", authController.forgotPassword);
router.get("/users", authenticate.verifyToken, authController.getUsers);
router.patch("/profile", authenticate.verifyToken, authController.updateProfile);
router.delete("/profile/:id", authenticate.verifyToken, authController.deleteProfile);

export default router;
