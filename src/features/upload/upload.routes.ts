import { Router } from "express";
import { uploadController } from "@/features/upload/controllers/upload.controller.js";
import { authenticate } from "@/middlewares/authMiddleware.js";

const router = Router();

router.post("/presigned-url", authenticate.verifyToken, uploadController.presignedUrl);
router.post("/confirm", authenticate.verifyToken, uploadController.confirm);

export default router;
