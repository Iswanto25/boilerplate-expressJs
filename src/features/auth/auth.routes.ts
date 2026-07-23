import { Router } from "express";
import { authController } from "@/features/auth/controllers/auth.controller.js";
import { authenticate } from "@/middlewares/authMiddleware.js";
import { uploadSinglePhoto } from "@/middlewares/multerMiddleware.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authenticate.verifyToken, authController.logout);
router.post("/refresh-token", authenticate.verifyToken, authController.refreshToken);
router.get("/profile", authenticate.verifyToken, authController.profile);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.get("/users", authenticate.verifyToken, authController.getUsers);
router.patch("/profile", authenticate.verifyToken, authController.updateProfile);
router.patch("/profile/photo", authenticate.verifyToken, uploadSinglePhoto, authController.updatePhoto);
router.patch("/profile/photo/direct", authenticate.verifyToken, authController.updatePhotoDirect);
router.delete("/profile/:id", authenticate.verifyToken, authController.deleteProfile);

export default router;
