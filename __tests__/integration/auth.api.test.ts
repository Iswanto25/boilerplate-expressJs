/**
 * Integration Test untuk Auth API
 * Menggunakan supertest untuk testing HTTP endpoints
 * Menggunakan @faker-js/faker untuk dummy data
 */

import { describe, it, expect, beforeAll, beforeEach, mock } from "bun:test";
import request from "supertest";
import { app } from "@/configs/express.js";
import { generateFakeRegisterData, generateFakeLoginData, setFakerSeed } from "__tests__/helpers/faker.helper.js";

mock.module("@/configs/database.js", () => ({
	__esModule: true,
	default: {
		user: {
			create: mock(),
			findFirst: mock(),
			findUnique: mock(),
			findMany: mock(),
			update: mock(),
			delete: mock(),
		},
		$transaction: mock().mockImplementation(async (callback: any) => {
			const db = await import("@/configs/database.js");
			return callback(db.default);
		}),
		$disconnect: mock(),
	},
}));

mock.module("@/utils/s3.js", () => ({
	uploadBase64: mock().mockResolvedValue("https://example.com/photo.jpg"),
	getFile: mock().mockReturnValue("https://example.com/photo.jpg"),
	deleteFile: mock().mockResolvedValue(undefined),
}));

mock.module("@/utils/tokenStore.js", () => ({
	storeToken: mock().mockResolvedValue("token-key"),
	getStoredToken: mock().mockResolvedValue("mock-refresh-token"),
	deleteToken: mock().mockResolvedValue(undefined),
}));

mock.module("@/utils/encryption.js", () => ({
	encryptionUtils: {
		encryptSensitive: mock().mockReturnValue({
			version: "v1",
			ciphertext: "encrypted-data",
		}),
		decryptSensitive: mock().mockReturnValue("decrypted-data"),
	},
	decryptSensitive: mock().mockReturnValue("decrypted-data"),
}));

mock.module("@/utils/jwt.js", () => ({
	jwtUtils: {
		generateAccessToken: mock(),
		generateRefreshToken: mock(),
		verifyAccessToken: mock(),
		verifyRefreshToken: mock(),
	},
}));

import prisma from "@/configs/database.js";
import { jwtUtils } from "@/utils/jwt.js";

describe("Auth API Integration Tests", () => {
	beforeAll(() => {
		setFakerSeed(12345);
	});

	describe("POST /api/auth/register", () => {
		it("should register a new user successfully", async () => {
			const registerData = generateFakeRegisterData();
			const fakeUser = {
				id: "user-id-123",
				...registerData,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			(prisma.user.findFirst as any).mockResolvedValue(null);
			(prisma.user.create as any).mockResolvedValue(fakeUser);

			const response = await request(app).post("/api/auth/register").send(registerData);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Berhasil register",
			});
			expect(response.body.data).toBeDefined();
		});

		it("should return 400 if required fields are missing", async () => {
			const incompleteData = {
				email: "test@example.com",
			};

			const response = await request(app).post("/api/auth/register").send(incompleteData);

			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({
				status: "error",
				message: "Data tidak lengkap",
			});
		});

		it("should return error if email already exists", async () => {
			const registerData = generateFakeRegisterData();
			const existingUser = {
				id: "existing-user-id",
				email: registerData.email,
			};

			(prisma.user.findFirst as any).mockResolvedValue(existingUser);

			const response = await request(app).post("/api/auth/register").send(registerData);

			expect(response.status).toBe(500);
			expect(response.body.message).toContain("Email");
		});
	});

	describe("POST /api/auth/login", () => {
		it("should login successfully with valid credentials", async () => {
			const loginData = generateFakeLoginData({
				email: "test@example.com",
				password: "test-password",
			});

			const fakeUser = {
				id: "user-id-123",
				email: loginData.email,
				password: await Bun.password.hash(loginData.password, { algorithm: "bcrypt", cost: 5 }),
				name: "Test User",
			};

			(prisma.user.findFirst as any).mockResolvedValue(fakeUser);

			const response = await request(app).post("/api/auth/login").send(loginData);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Berhasil login",
			});
			expect(response.body.data).toHaveProperty("accessToken");
			expect(response.body.data).toHaveProperty("refreshToken");
		});

		it("should return 400 if credentials are missing", async () => {
			const incompleteData = {
				email: "test@example.com",
			};

			const response = await request(app).post("/api/auth/login").send(incompleteData);

			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({
				status: "error",
				message: "Data tidak lengkap",
			});
		});

		it("should return error if user not found", async () => {
			const loginData = generateFakeLoginData();
			(prisma.user.findFirst as any).mockResolvedValue(null);

			const response = await request(app).post("/api/auth/login").send(loginData);

			expect(response.status).toBe(500);
			expect(response.body.message).toContain("tidak ditemukan");
		});
	});

	describe("POST /api/auth/refresh-token", () => {
		it("should refresh token successfully", async () => {
			const mockUser = {
				id: "user-id-123",
				email: "test@example.com",
				name: "Test User",
			};

			(jwtUtils.verifyRefreshToken as any).mockReturnValue({ userId: mockUser.id });
			(prisma.user.findUnique as any).mockResolvedValue(mockUser);

			const refreshData = {
				refreshToken: "valid-refresh-token",
			};

			const response = await request(app).post("/api/auth/refresh-token").send(refreshData);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Berhasil refresh token",
			});
		});

		it("should return 400 if refresh token is missing", async () => {
			const response = await request(app).post("/api/auth/refresh-token").send({});

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Data tidak lengkap");
		});
	});

	describe("POST /api/auth/forgot-password", () => {
		it("should send forgot password email successfully", async () => {
			const mockUser = {
				id: "user-id-123",
				email: "test@example.com",
				name: "Test User",
			};

			(prisma.user.findFirst as any).mockResolvedValue(mockUser);

			const emailData = {
				email: mockUser.email,
			};

			const response = await request(app).post("/api/auth/forgot-password").send(emailData);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Berhasil kirim email",
			});
		});

		it("should return 400 if email is missing", async () => {
			const response = await request(app).post("/api/auth/forgot-password").send({});

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Data tidak lengkap");
		});
	});

	describe("GET /api/auth/users", () => {
		it("should get all users successfully", async () => {
			const fakeUsers = Array.from({ length: 5 }, (_, i) => ({
				id: `user-id-${i}`,
				email: `user${i}@example.com`,
				name: `User ${i}`,
			}));

			(prisma.user.findMany as any).mockResolvedValue(fakeUsers);

			const response = await request(app).get("/api/auth/users");

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Berhasil get users",
			});
			expect(Array.isArray(response.body.data)).toBe(true);
		});
	});
});
