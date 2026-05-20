/**
 * Unit Test untuk Auth Middleware
 */
import { describe, it, expect, beforeAll, beforeEach, mock } from "bun:test";
import { authenticate } from "@/middlewares/authMiddleware.js";
import { createMockRequest, createMockResponse } from "__tests__/helpers/mock.helper.js";
import { setFakerSeed } from "__tests__/helpers/faker.helper.js";

mock.module("@/configs/database.js", () => ({
	__esModule: true,
	default: {
		user: {
			findUnique: mock(),
		},
	},
}));

mock.module("@/utils/jwt.js", () => ({
	jwtUtils: {
		verifyAccessToken: mock(),
	},
}));

mock.module("@/utils/tokenStore.js", () => ({
	getStoredToken: mock(),
}));

mock.module("@/utils/respons.js", () => {
	const actual = require("@/utils/respons.js");
	return {
		...actual,
		respons: {
			...actual.respons,
			error: mock(),
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
		// Bun mocks handled via mock.module
	});

	it("should return valid: false when no authorization header", async () => {
		const req = createMockRequest({ headers: {} });
		const result = await authenticate.checkToken(req as any);
		expect(result).toEqual({ valid: false });
	});

	it("should return valid: false when authorization header is not Bearer", async () => {
		const req = createMockRequest({
			headers: { authorization: "Basic dGVzdDp0ZXN0" } as any,
		});
		const result = await authenticate.checkToken(req as any);
		expect(result).toEqual({ valid: false });
	});

	it("should return valid: false when token is invalid", async () => {
		const req = createMockRequest({
			headers: { authorization: "Bearer invalid-token" } as any,
		});
		(jwtUtils.verifyAccessToken as any).mockImplementation(() => {
			throw new Error("Invalid token");
		});

		const result = await authenticate.checkToken(req as any);
		expect(result).toEqual({ valid: false });
	});

	it("should return valid: false when stored token does not match", async () => {
		const decoded = { id: "user-123" };
		const req = createMockRequest({
			headers: { authorization: "Bearer valid-token" } as any,
		});
		(jwtUtils.verifyAccessToken as any).mockReturnValue(decoded);
		(getStoredToken as any).mockResolvedValue("different-token");

		const result = await authenticate.checkToken(req as any);

		expect(result).toEqual({ valid: false });
		expect(getStoredToken).toHaveBeenCalledWith("user-123", "access");
	});

	it("should return valid: true with userId when token is valid and stored", async () => {
		const decoded = { id: "user-123" };
		const req = createMockRequest({
			headers: { authorization: "Bearer valid-token" } as any,
		});
		(jwtUtils.verifyAccessToken as any).mockReturnValue(decoded);
		(getStoredToken as any).mockResolvedValue("valid-token");

		const result = await authenticate.checkToken(req as any);

		expect(result).toEqual({ valid: true, userId: "user-123" });
	});
});

describe("Auth Middleware - verifyToken", () => {
	it("should call next() when token is valid and user exists", async () => {
		const decoded = { id: "user-123" };
		const dbUser = { id: "user-123", email: "test@example.com", roleId: "role-1" };
		const req = createMockRequest({
			headers: { authorization: "Bearer valid-token" } as any,
		});
		const res = createMockResponse();
		const next = mock(() => {});

		(jwtUtils.verifyAccessToken as any).mockReturnValue(decoded);
		(getStoredToken as any).mockResolvedValue("valid-token");
		(prisma.user.findUnique as any).mockResolvedValue(dbUser);

		await authenticate.verifyToken(req as any, res as any, next as any);

		expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "user-123" } });
		expect(req.user).toEqual({ id: "user-123", email: "test@example.com", roleId: "role-1" } as any);
		expect(next).toHaveBeenCalled();
	});

	it("should return unauthorized when token is missing", async () => {
		const req = createMockRequest({ headers: {} });
		const res = createMockResponse();
		const next = mock(() => {});

		await authenticate.verifyToken(req as any, res as any, next as any);

		expect(respons.error).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});
});
