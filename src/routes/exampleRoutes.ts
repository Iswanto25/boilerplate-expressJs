import { Router, Request, Response } from "express";
import { verifyApiKey } from "../utils/signature";
import { respons, HttpStatus } from "../utils/respons";

const router = Router();

/**
 * Example endpoint yang dilindungi dengan API signature
 * Membutuhkan header: x-api-key dengan signature yang valid
 */
router.get("/protected", verifyApiKey, (req: Request, res: Response) => {
	const data = {
		message: "Ini adalah endpoint yang dilindungi dengan API signature",
		timestamp: new Date().toISOString(),
		info: "API Key Anda valid!",
	};

	return respons.success("Access granted", data, HttpStatus.OK, res, req);
});

/**
 * Example endpoint publik tanpa signature
 */
router.get("/public", (req: Request, res: Response) => {
	const data = {
		message: "Ini adalah endpoint publik",
		timestamp: new Date().toISOString(),
		info: "Tidak memerlukan API key",
	};

	return respons.success("Public access", data, HttpStatus.OK, res, req);
});

export default router;
