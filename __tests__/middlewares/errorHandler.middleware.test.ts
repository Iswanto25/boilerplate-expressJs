/**
 * Unit Test untuk Error Handler Middleware
 */
import { errorHandler, notFoundHandler } from "@/middlewares/errorHandler.js";
import { createMockRequest, createMockResponse } from "__tests__/helpers/mock.helper.js";
import { setFakerSeed } from "__tests__/helpers/faker.helper.js";

jest.mock("@/utils/logger.js", () => ({
	logger: {
		error: jest.fn(),
	},
}));
jest.mock("@/utils/respons.js", () => ({
	...jest.requireActual("@/utils/respons.js"),
	respons: {
		...jest.requireActual("@/utils/respons.js").respons,
		error: jest.fn(),
	},
}));

import { logger } from "@/utils/logger.js";
import { respons } from "@/utils/respons.js";

describe("Error Handler Middleware", () => {
	beforeAll(() => {
		setFakerSeed(44444);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("errorHandler", () => {
		it("should handle error with custom statusCode", () => {
			const error = new Error("Validation failed") as any;
			error.statusCode = 422;
			const req = createMockRequest();
			const res = createMockResponse();
			const next = jest.fn();

			errorHandler(error, req as any, res as any, next);

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					error: "Validation failed",
					statusCode: 422,
				}),
			);
			expect(respons.error).toHaveBeenCalledWith("Validation failed", null, 422, res, req);
		});

		it("should handle error with 'status' property (alternative)", () => {
			const error = new Error("Not Found") as any;
			error.status = 404;
			const req = createMockRequest();
			const res = createMockResponse();
			const next = jest.fn();

			errorHandler(error, req as any, res as any, next);

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 404,
				}),
			);
			expect(respons.error).toHaveBeenCalledWith("Not Found", null, 404, res, req);
		});

		it("should default to 500 when no statusCode provided", () => {
			const error = new Error("Something broke");
			const req = createMockRequest();
			const res = createMockResponse();
			const next = jest.fn();

			errorHandler(error, req as any, res as any, next);

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 500,
				}),
			);
			expect(respons.error).toHaveBeenCalledWith("Something broke", null, 500, res, req);
		});

		it("should include stack trace in non-production", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "development";

			const error = new Error("Dev error");
			const req = createMockRequest();
			const res = createMockResponse();
			const next = jest.fn();

			errorHandler(error, req as any, res as any, next);

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					error: "Dev error",
					stack: expect.any(String),
				}),
			);

			process.env.NODE_ENV = originalEnv;
		});

		it("should hide stack trace in production for 500 errors", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";

			const error = new Error("Sensitive database error") as any;
			error.statusCode = 500;
			const req = createMockRequest();
			const res = createMockResponse();
			const next = jest.fn();

			errorHandler(error, req as any, res as any, next);

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					error: "Sensitive database error",
					stack: undefined,
				}),
			);

			process.env.NODE_ENV = originalEnv;
		});

		it("should mask internal error message in production for 500", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";

			const error = new Error("DB connection failed: postgresql://...") as any;
			error.statusCode = 500;
			const req = createMockRequest();
			const res = createMockResponse();
			const next = jest.fn();

			errorHandler(error, req as any, res as any, next);

			expect(respons.error).toHaveBeenCalledWith("Internal server error", null, 500, res, req);

			process.env.NODE_ENV = originalEnv;
		});

		it("should include req path and method in error log", () => {
			const error = new Error("Route error");
			const req = createMockRequest({ path: "/api/users", method: "POST" });
			const res = createMockResponse();
			const next = jest.fn();

			errorHandler(error, req as any, res as any, next);

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					path: "/api/users",
					method: "POST",
				}),
			);
		});

		it("should handle error with statusCode prioritized over status", () => {
			const error = new Error("Conflict") as any;
			error.statusCode = 409;
			error.status = 400;
			const req = createMockRequest();
			const res = createMockResponse();
			const next = jest.fn();

			errorHandler(error, req as any, res as any, next);

			expect(respons.error).toHaveBeenCalledWith("Conflict", null, 409, res, req);
		});
	});

	describe("notFoundHandler", () => {
		it("should return 404 with route information", () => {
			const req = createMockRequest({ method: "GET", path: "/api/nonexistent" });
			const res = createMockResponse();
			const next = jest.fn();

			notFoundHandler(req as any, res as any, next);

			expect(respons.error).toHaveBeenCalled();
			const callArgs = (respons.error as jest.Mock).mock.calls[0];
			expect(callArgs[0]).toContain("GET /api/nonexistent not found");
			expect(callArgs[2]).toBe(404);
		});

		it("should include HTTP method in not found message", () => {
			const req = createMockRequest({ method: "DELETE", path: "/api/old-endpoint" });
			const res = createMockResponse();
			const next = jest.fn();

			notFoundHandler(req as any, res as any, next);

			expect(respons.error).toHaveBeenCalled();
			const callArgs = (respons.error as jest.Mock).mock.calls[0];
			expect(callArgs[0]).toContain("DELETE");
		});
	});
});
