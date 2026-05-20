/**
 * Unit Test untuk RBAC Middleware
 */
import { describe, it, expect, beforeAll, beforeEach, mock } from "bun:test";
import { requirePermission } from "@/middlewares/rbacMiddleware.js";
import { createMockRequest, createMockResponse, createMockAuthenticatedUser } from "__tests__/helpers/mock.helper.js";
import { setFakerSeed } from "__tests__/helpers/faker.helper.js";

mock.module("@/configs/database.js", () => ({
	__esModule: true,
	default: {
		rolePermission: {
			findFirst: mock(),
		},
	},
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

import prisma from "@/configs/database.js";
import { respons } from "@/utils/respons.js";

describe("RBAC Middleware - requirePermission", () => {
	beforeAll(() => {
		setFakerSeed(77777);
	});

	it("should call next() when user has the required permission", async () => {
		const user = createMockAuthenticatedUser({ roleId: "role-1" });
		const req = createMockRequest({ user });
		const res = createMockResponse();
		const next = mock(() => {});

		(prisma.rolePermission.findFirst as any).mockResolvedValue({
			roleId: "role-1",
			resourceId: "res-1",
			grantedActions: ["read", "write", "delete"],
		});

		const middleware = requirePermission("users", "read");
		await middleware(req as any, res as any, next);

		expect(prisma.rolePermission.findFirst).toHaveBeenCalledWith({
			where: {
				roleId: "role-1",
				resource: { name: "users" },
			},
		});
		expect(next).toHaveBeenCalled();
	});

	it("should return forbidden when user is not authenticated", async () => {
		const req = createMockRequest({ user: undefined });
		const res = createMockResponse();
		const next = mock(() => {});

		const middleware = requirePermission("users", "read");
		await middleware(req as any, res as any, next);

		expect(respons.error).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it("should return forbidden when user has no roleId", async () => {
		const req = createMockRequest({ user: { id: "user-1", email: "test@test.com" } });
		const res = createMockResponse();
		const next = mock(() => {});

		const middleware = requirePermission("users", "read");
		await middleware(req as any, res as any, next);

		expect(respons.error).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it("should return forbidden when no rolePermission exists for the resource", async () => {
		const user = createMockAuthenticatedUser({ roleId: "role-2" });
		const req = createMockRequest({ user });
		const res = createMockResponse();
		const next = mock(() => {});

		(prisma.rolePermission.findFirst as any).mockResolvedValue(null);

		const middleware = requirePermission("settings", "write");
		await middleware(req as any, res as any, next);

		expect(respons.error).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it("should return forbidden when action is not in grantedActions", async () => {
		const user = createMockAuthenticatedUser({ roleId: "role-3" });
		const req = createMockRequest({ user });
		const res = createMockResponse();
		const next = mock(() => {});

		(prisma.rolePermission.findFirst as any).mockResolvedValue({
			roleId: "role-3",
			resourceId: "res-1",
			grantedActions: ["read"],
		});

		const middleware = requirePermission("users", "delete");
		await middleware(req as any, res as any, next);

		expect(respons.error).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it("should handle database error and return internal server error", async () => {
		const user = createMockAuthenticatedUser({ roleId: "role-4" });
		const req = createMockRequest({ user });
		const res = createMockResponse();
		const next = mock(() => {});

		(prisma.rolePermission.findFirst as any).mockRejectedValue(new Error("DB connection lost"));

		const middleware = requirePermission("users", "read");
		await middleware(req as any, res as any, next);

		expect(respons.error).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it("should check different resource names independently", async () => {
		const user = createMockAuthenticatedUser({ roleId: "role-5" });
		const req1 = createMockRequest({ user });
		const res1 = createMockResponse();
		const next1 = mock(() => {});

		(prisma.rolePermission.findFirst as any).mockResolvedValue({
			grantedActions: ["create"],
		});

		const middleware = requirePermission("files", "create");
		await middleware(req1 as any, res1 as any, next1);

		expect(prisma.rolePermission.findFirst).toHaveBeenCalledWith({
			where: {
				roleId: "role-5",
				resource: { name: "files" },
			},
		});
		expect(next1).toHaveBeenCalled();
	});

	it("should properly close over resourceName and action", async () => {
		const user = createMockAuthenticatedUser({ roleId: "role-6" });
		const req = createMockRequest({ user });
		const res = createMockResponse();
		const next = mock(() => {});

		(prisma.rolePermission.findFirst as any).mockResolvedValue({
			grantedActions: ["export", "import"],
		});

		const middleware = requirePermission("reports", "export");
		await middleware(req as any, res as any, next);

		expect(prisma.rolePermission.findFirst).toHaveBeenCalledWith({
			where: {
				roleId: "role-6",
				resource: { name: "reports" },
			},
		});
		expect(next).toHaveBeenCalled();
	});
});
