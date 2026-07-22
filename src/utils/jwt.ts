import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || JWT_SECRET.trim() === "") {
	throw new Error("JWT_SECRET environment variable is missing or empty!");
}

if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.trim() === "") {
	throw new Error("JWT_REFRESH_SECRET environment variable is missing or empty!");
}

export const jwtUtils = {
	generateAccessToken: (payload: object) => {
		return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d", jwtid: crypto.randomUUID() });
	},
	generateRefreshToken: (payload: object) => {
		return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d", jwtid: crypto.randomUUID() });
	},
	verifyAccessToken: (token: string) => {
		return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
	},
	verifyRefreshToken: (token: string) => {
		return jwt.verify(token, JWT_REFRESH_SECRET) as jwt.JwtPayload;
	},
};
