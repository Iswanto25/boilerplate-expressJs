/**
 * Integration Test untuk Auth API
 * Menggunakan supertest untuk testing HTTP endpoints
 * Menggunakan @faker-js/faker untuk dummy data
 */

import request from "supertest";
import { app } from "../../src/configs/express.js";
import { generateFakeRegisterData, generateFakeLoginData, generateBulkRegisterData, setFakerSeed } from "../helpers/faker.helper.js";
import prisma from "../../src/configs/database.js";

// Mock database untuk integration test
jest.mock("../../src/configs/database.js", () => ({
	__esModule: true,
	default: {
		user: {
			create: jest.fn(),
			findFirst: jest.fn(),
			findUnique: jest.fn(),
			findMany: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		},
		$disconnect: jest.fn(),
	},
}));

jest.mock("../../src/utils/s3", () => ({
	uploadBase64: jest.fn().mockResolvedValue("https://example.com/photo.jpg"),
	getFile: jest.fn().mockReturnValue("https://example.com/photo.jpg"),
	deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../src/utils/tokenStore", () => ({
	storeRefreshToken: jest.fn().mockResolvedValue(undefined),
	getRefreshToken: jest.fn().mockResolvedValue("mock-refresh-token"),
	deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../src/utils/encryption", () => ({
	encryptionUtils: {
		encryptSensitive: jest.fn().mockReturnValue({
			version: "v1",
			ciphertext: "encrypted-data",
		}),
	},
	decryptSensitive: jest.fn().mockReturnValue("decrypted-data"),
}));

describe("Auth API Integration Tests", () => {
	beforeAll(() => {
		setFakerSeed(12345);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("POST /api/auth/register", () => {
		it("should register a new user successfully", async () => {
			// Arrange
			const registerData = generateFakeRegisterData();
			const fakeUser = {
				id: "user-id-123",
				...registerData,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
			(prisma.user.create as jest.Mock).mockResolvedValue(fakeUser);

			// Act
			const response = await request(app).post("/api/auth/register").send(registerData);

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Berhasil register",
			});
			expect(response.body.data).toBeDefined();
		});

		it("should return 400 if required fields are missing", async () => {
			// Arrange
			const incompleteData = {
				email: "test@example.com",
				// missing name and password
			};

			// Act
			const response = await request(app).post("/api/auth/register").send(incompleteData);

			// Assert
			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({
				status: "error",
				message: "Data tidak lengkap",
			});
		});

		it("should return error if email already exists", async () => {
			// Arrange
			const registerData = generateFakeRegisterData();
			const existingUser = {
				id: "existing-user-id",
				email: registerData.email,
			};

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(existingUser);

			// Act
			const response = await request(app).post("/api/auth/register").send(registerData);

			// Assert
			expect(response.status).toBe(500);
			expect(response.body.message).toContain("Email");
		});
	});

	describe("POST /api/auth/login", () => {
		it("should login successfully with valid credentials", async () => {
			// Arrange
			const loginData = generateFakeLoginData({
				email: "test@example.com",
				password: "test-password",
			});

			const { encryptPassword } = require("../../src/utils/utils");
			const hashedPassword = encryptPassword(loginData.password);

			const fakeUser = {
				id: "user-id-123",
				email: loginData.email,
				password: hashedPassword,
				name: "Test User",
			};

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(fakeUser);

			// Act
			const response = await request(app).post("/api/auth/login").send(loginData);

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Berhasil login",
			});
			expect(response.body.data).toHaveProperty("accessToken");
			expect(response.body.data).toHaveProperty("refreshToken");
		});

		it("should return 400 if credentials are missing", async () => {
			// Arrange
			const incompleteData = {
				email: "test@example.com",
				// missing password
			};

			// Act
			const response = await request(app).post("/api/auth/login").send(incompleteData);

			// Assert
			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({
				status: "error",
				message: "Data tidak lengkap",
			});
		});

		it("should return error if user not found", async () => {
			// Arrange
			const loginData = generateFakeLoginData();
			(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

			// Act
			const response = await request(app).post("/api/auth/login").send(loginData);

			// Assert
			expect(response.status).toBe(500);
			expect(response.body.message).toContain("tidak ditemukan");
		});
	});

	describe("POST /api/auth/bulk-register", () => {
		it("should bulk register users successfully", async () => {
			// Arrange
			const bulkData = generateBulkRegisterData(5);

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
			(prisma.user.create as jest.Mock).mockImplementation((args) => {
				return Promise.resolve({
					id: "user-id-" + Math.random(),
					...args.data,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			});

			// Act
			const response = await request(app).post("/api/auth/bulk-register").send(bulkData);

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Bulk register selesai",
			});
			expect(response.body.data).toHaveProperty("total");
			expect(response.body.data).toHaveProperty("success");
			expect(response.body.data).toHaveProperty("successRate");
		});

		it("should return 400 if data is not an array", async () => {
			// Arrange
			const invalidData = { notAnArray: true };

			// Act
			const response = await request(app).post("/api/auth/bulk-register").send(invalidData);

			// Assert
			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Data harus berupa array");
		});

		it("should return 400 if array is empty", async () => {
			// Act
			const response = await request(app).post("/api/auth/bulk-register").send([]);

			// Assert
			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Array tidak boleh kosong");
		});
	});

	describe("POST /api/auth/refresh-token", () => {
		it("should refresh token successfully", async () => {
			// Arrange
			const { verifyRefreshToken } = require("../../src/utils/jwt");
			const mockUser = {
				id: "user-id-123",
				email: "test@example.com",
				name: "Test User",
			};

			(verifyRefreshToken as jest.Mock).mockReturnValue({ userId: mockUser.id });
			(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

			const refreshData = {
				refreshToken: "valid-refresh-token",
			};

			// Act
			const response = await request(app).post("/api/auth/refresh-token").send(refreshData);

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Berhasil refresh token",
			});
		});

		it("should return 400 if refresh token is missing", async () => {
			// Act
			const response = await request(app).post("/api/auth/refresh-token").send({});

			// Assert
			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Data tidak lengkap");
		});
	});

	describe("POST /api/auth/forgot-password", () => {
		it("should send forgot password email successfully", async () => {
			// Arrange
			const mockUser = {
				id: "user-id-123",
				email: "test@example.com",
				name: "Test User",
			};

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

			const emailData = {
				email: mockUser.email,
			};

			// Mock SMTP
			const { sendMail } = require("../../src/utils/smtp");
			if (sendMail) {
				sendMail.mockResolvedValue(true);
			}

			// Act
			const response = await request(app).post("/api/auth/forgot-password").send(emailData);

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Berhasil kirim email",
			});
		});

		it("should return 400 if email is missing", async () => {
			// Act
			const response = await request(app).post("/api/auth/forgot-password").send({});

			// Assert
			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Data tidak lengkap");
		});
	});

	describe("GET /api/auth/users", () => {
		it("should get all users successfully", async () => {
			// Arrange
			const fakeUsers = Array.from({ length: 5 }, (_, i) => ({
				id: `user-id-${i}`,
				email: `user${i}@example.com`,
				name: `User ${i}`,
			}));

			(prisma.user.findMany as jest.Mock).mockResolvedValue(fakeUsers);

			// Act
			const response = await request(app).get("/api/auth/users");

			// Assert
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				status: "success",
				message: "Berhasil get users",
			});
			expect(Array.isArray(response.body.data)).toBe(true);
		});
	});
});
