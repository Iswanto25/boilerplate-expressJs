/**
 * Unit Test untuk Auth Middleware
 */
import { authenticate } from "@/middlewares/authMiddleware.js";
import { createMockRequest, createMockResponse } from "__tests__/helpers/mock.helper.js";
import { setFakerSeed } from "__tests__/helpers/faker.helper.js";

jest.mock("@/configs/database.js", () => ({
	__esModule: true,
	default: {
		user: {
			findUnique: jest.fn(),
		},
	},
}));
jest.mock("@/utils/jwt.js", () => ({
	jwtUtils: {
		verifyAccessToken: jest.fn(),
	},
}));
jest.mock("@/utils/tokenStore.js", () => ({
	getStoredToken: jest.fn(),
}));
jest.mock("@/utils/respons.js", () => {
	const actual = jest.requireActual("@/utils/respons.js");
	return {
		...actual,
		respons: {
			...actual.respons,
			error: jest.fn(),
		},
	};
});

import { jwtUtils } from "@/utils/jwt.js";
import { getStoredToken } from "@/utils/tokenStore.js";
import prisma from "@/configs/database.js";
import { respons } from "@/utils/respons.js";

describe("Auth Middleware - checkToken", () => {
	beforeAll(() => {
		setFakerSeed(99999);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should return valid: false when no authorization header", async () => {
		const req = createMockRequest({ headers: {} });

		const result = await authenticate.checkToken(req as any);

		expect(result).toEqual({ valid: false });
	});

	it("should return valid: false when authorization header is not Bearer", async () => {
		const req = createMockRequest({
			headers: { authorization: "Basic dGVzdDp0ZXN0" },
		});

		const result = await authenticate.checkToken(req as any);

		expect(result).toEqual({ valid: false });
	});

	it("should return valid: false when token is invalid", async () => {
		const req = createMockRequest({
			headers: { authorization: "Bearer invalid-token" },
		});
		(jwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
			throw new Error("Invalid token");
		});

		const result = await authenticate.checkToken(req as any);

		expect(result).toEqual({ valid: false });
	});

	it("should return valid: false when stored token does not match", async () => {
		const decoded = { id: "user-123" };
		const req = createMockRequest({
			headers: { authorization: "Bearer valid-token" },
		});
		(jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(decoded);
		(getStoredToken as jest.Mock).mockResolvedValue("different-token");

		const result = await authenticate.checkToken(req as any);

		expect(result).toEqual({ valid: false });
		expect(getStoredToken).toHaveBeenCalledWith("user-123", "access");
	});

	it("should return valid: true with userId when token is valid and stored", async () => {
		const decoded = { id: "user-123" };
		const req = createMockRequest({
			headers: { authorization: "Bearer valid-token" },
		});
		(jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(decoded);
		(getStoredToken as jest.Mock).mockResolvedValue("valid-token");

		const result = await authenticate.checkToken(req as any);

		expect(result).toEqual({ valid: true, userId: "user-123" });
	});

	it("should handle tokenStore error gracefully and return valid: false", async () => {
		const decoded = { id: "user-123" };
		const req = createMockRequest({
			headers: { authorization: "Bearer valid-token" },
		});
		(jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(decoded);
		(getStoredToken as jest.Mock).mockRejectedValue(new Error("Redis connection error"));

		const result = await authenticate.checkToken(req as any);

		expect(result).toEqual({ valid: false });
	});
});

describe("Auth Middleware - verifyToken", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should call next() when token is valid and user exists", async () => {
		const decoded = { id: "user-123" };
		const dbUser = { id: "user-123", email: "test@example.com", roleId: "role-1" };
		const req = createMockRequest({
			headers: { authorization: "Bearer valid-token" },
		});
		const res = createMockResponse();
		const next = jest.fn();

		(jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(decoded);
		(getStoredToken as jest.Mock).mockResolvedValue("valid-token");
		(prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

		await authenticate.verifyToken(req as any, res as any, next);

		expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "user-123" } });
		expect(req.user).toEqual({ id: "user-123", email: "test@example.com", roleId: "role-1" });
		expect(next).toHaveBeenCalled();
	});

	it("should return unauthorized when token is missing", async () => {
		const req = createMockRequest({ headers: {} });
		const res = createMockResponse();
		const next = jest.fn();

		await authenticate.verifyToken(req as any, res as any, next);

		expect(respons.error).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it("should return unauthorized when user not found in database", async () => {
		const decoded = { id: "user-not-found" };
		const req = createMockRequest({
			headers: { authorization: "Bearer valid-token" },
		});
		const res = createMockResponse();
		const next = jest.fn();

		(jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(decoded);
		(getStoredToken as jest.Mock).mockResolvedValue("valid-token");
		(prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

		await authenticate.verifyToken(req as any, res as any, next);

		expect(respons.error).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it("should return unauthorized when checkToken returns invalid", async () => {
		const req = createMockRequest({
			headers: { authorization: "Bearer expired-token" },
		});
		const res = createMockResponse();
		const next = jest.fn();

		(jwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
			throw new Error("Token expired");
		});

		await authenticate.verifyToken(req as any, res as any, next);

		expect(respons.error).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it("should pass through checkToken validation before DB lookup", async () => {
		const decoded = { id: "user-123" };
		const req = createMockRequest({
			headers: { authorization: "Bearer good-token" },
		});
		const res = createMockResponse();
		const next = jest.fn();

		(jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(decoded);
		(getStoredToken as jest.Mock).mockResolvedValue("good-token");
		(prisma.user.findUnique as jest.Mock).mockResolvedValue({
			id: "user-123",
			email: "user@test.com",
			roleId: "role-admin",
		});

		await authenticate.verifyToken(req as any, res as any, next);

		expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith("good-token");
		expect(getStoredToken).toHaveBeenCalledWith("user-123", "access");
		expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "user-123" } });
		expect(next).toHaveBeenCalled();
	});
});
