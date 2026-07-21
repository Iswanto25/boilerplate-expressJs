import { Router } from "express";
import { authController } from "@/features/auth/controllers/auth.controller.js";
import { authenticate } from "@/middlewares/authMiddleware.js";
import { uploadSinglePhoto } from "@/middlewares/multerMiddleware.js";
import { rateLimiter } from "@/utils/rateLimiter.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authenticate.verifyToken, authController.logout);
router.post("/refresh-token", authenticate.verifyToken, authController.refreshToken);
router.get("/profile", authenticate.verifyToken, rateLimiter({ windowInSeconds: 30, maxRequests: 3, useUserId: true }), authController.profile);
router.post("/forgot-password", rateLimiter({ windowInSeconds: 30, maxRequests: 5 }), authController.forgotPassword);
router.post("/reset-password", rateLimiter({ windowInSeconds: 30, maxRequests: 5 }), authController.resetPassword);
router.post("/send-otp", rateLimiter({ windowInSeconds: 60, maxRequests: 3 }), authController.sendOtp);
router.post("/verify-otp", rateLimiter({ windowInSeconds: 60, maxRequests: 5 }), authController.verifyOtp);
router.get("/users", authenticate.verifyToken, authController.getUsers);
router.patch("/profile", authenticate.verifyToken, authController.updateProfile);
router.patch("/profile/photo", authenticate.verifyToken, uploadSinglePhoto, authController.updatePhoto);
router.delete("/profile/:id", authenticate.verifyToken, authController.deleteProfile);

export default router;
