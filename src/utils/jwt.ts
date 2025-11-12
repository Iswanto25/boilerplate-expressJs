import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

export const jwtUtils = {
    generateAccessToken: (payload: object) => {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    },
    generateRefreshToken: (payload: object) => {
        return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    },
    verifyAccessToken: (token: string) => {
        return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    },
    verifyRefreshToken: (token: string) => {
        return jwt.verify(token, JWT_REFRESH_SECRET) as jwt.JwtPayload;
    },
};