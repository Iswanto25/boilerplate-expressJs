/**
 * Unit Test untuk Auth Services
 * Menggunakan @faker-js/faker untuk dummy data
 */

import { authServices } from "./authServices";
import prisma from "../../../configs/database";
import {
	generateFakeUser,
	generateFakeRegisterData,
	generateFakeLoginData,
	generateBulkRegisterData,
	setFakerSeed,
	generateFakeUUID,
} from "../../../../__tests__/helpers/faker.helper";
import { encryptPassword, comparePassword } from "../../../utils/utils";

// Mock dependencies
jest.mock("../../../configs/database", () => ({
	__esModule: true,
	default: {
		user: {
			create: jest.fn(),
			findFirst: jest.fn(),
			findUnique: jest.fn(),
			findMany: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			count: jest.fn(),
			createMany: jest.fn(),
		},
		$transaction: jest.fn(),
	},
}));

jest.mock("../../../utils/s3", () => ({
	uploadBase64: jest.fn().mockResolvedValue("https://example.com/photo.jpg"),
	getFile: jest.fn().mockReturnValue("https://example.com/photo.jpg"),
	deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../utils/jwt", () => ({
	generateAccessToken: jest.fn().mockReturnValue("mock-access-token"),
	generateRefreshToken: jest.fn().mockReturnValue("mock-refresh-token"),
	verifyRefreshToken: jest.fn().mockReturnValue({ userId: "test-user-id" }),
}));

jest.mock("../../../utils/tokenStore", () => ({
	storeRefreshToken: jest.fn().mockResolvedValue(undefined),
	getRefreshToken: jest.fn().mockResolvedValue("mock-refresh-token"),
	deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../utils/encryption", () => ({
	encryptionUtils: {
		encryptSensitive: jest.fn().mockReturnValue({
			version: "v1",
			ciphertext: "encrypted-data",
		}),
	},
	decryptSensitive: jest.fn().mockReturnValue("decrypted-data"),
}));

describe("Auth Services", () => {
	beforeAll(() => {
		// Set seed untuk konsistensi
		setFakerSeed(12345);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("register", () => {
		it("should register a new user successfully", async () => {
			// Arrange
			const registerData = generateFakeRegisterData();
			const fakeUser = generateFakeUser({
				email: registerData.email,
				name: registerData.name,
			});

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
			(prisma.user.create as jest.Mock).mockResolvedValue(fakeUser);

			// Act
			const result = await authServices.register(registerData);

			// Assert
			expect(prisma.user.findFirst).toHaveBeenCalledWith({
				where: { email: registerData.email },
			});
			expect(prisma.user.create).toHaveBeenCalled();
			expect(result).toBeDefined();
			expect(result.user.email).toBe(registerData.email);
		});

		it("should throw error if email already exists", async () => {
			// Arrange
			const registerData = generateFakeRegisterData();
			const existingUser = generateFakeUser({ email: registerData.email });

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(existingUser);

			// Act & Assert
			await expect(authServices.register(registerData)).rejects.toThrow("Email already exists");
			expect(prisma.user.create).not.toHaveBeenCalled();
		});

		it("should handle password encryption correctly", async () => {
			// Arrange
			const registerData = generateFakeRegisterData({
				password: "test-password-123",
			});
			const fakeUser = generateFakeUser();

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
			(prisma.user.create as jest.Mock).mockResolvedValue(fakeUser);

			// Act
			await authServices.register(registerData);

			// Assert
			expect(prisma.user.create).toHaveBeenCalled();
			const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
			expect(createCall.data.password).not.toBe(registerData.password);
			// Password should be hashed
			expect(createCall.data.password.length).toBeGreaterThan(20);
		});
	});

	describe("login", () => {
		it("should login successfully with correct credentials", async () => {
			// Arrange
			const loginData = generateFakeLoginData({
				email: "test@example.com",
				password: "correct-password",
			});
			const hashedPassword = encryptPassword("correct-password");
			const fakeUser = generateFakeUser({
				email: loginData.email,
				password: hashedPassword,
			});

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(fakeUser);

			// Act
			const result = await authServices.login(loginData.email, loginData.password);

			// Assert
			expect(prisma.user.findFirst).toHaveBeenCalledWith({
				where: { email: loginData.email },
			});
			expect(result).toBeDefined();
			expect(result.accessToken).toBe("mock-access-token");
			expect(result.refreshToken).toBe("mock-refresh-token");
		});

		it("should throw error if user not found", async () => {
			// Arrange
			const loginData = generateFakeLoginData();
			(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

			// Act & Assert
			await expect(authServices.login(loginData.email, loginData.password)).rejects.toThrow("User not found");
		});

		it("should throw error if password is incorrect", async () => {
			// Arrange
			const loginData = generateFakeLoginData();
			const hashedPassword = encryptPassword("correct-password");
			const fakeUser = generateFakeUser({
				email: loginData.email,
				password: hashedPassword,
			});

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(fakeUser);

			// Act & Assert
			await expect(authServices.login(loginData.email, "wrong-password")).rejects.toThrow();
		});
	});

	describe("bulkRegister", () => {
		it("should register multiple users successfully", async () => {
			// Arrange
			const bulkData = generateBulkRegisterData(5);
			const fakeUsers = bulkData.map((data) => generateFakeUser({ email: data.email }));

			(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
			(prisma.user.create as jest.Mock).mockImplementation((args) => {
				const user = fakeUsers.find((u) => u.email === args.data.email);
				return Promise.resolve(user);
			});

			// Act
			const result = await authServices.bulkRegister(bulkData);

			// Assert
			expect(result).toBeDefined();
			expect(result.total).toBe(5);
			expect(result.success).toBeGreaterThan(0);
			expect(result.failed).toBe(0);
		});

		it("should handle partial failures gracefully", async () => {
			// Arrange
			const bulkData = generateBulkRegisterData(3);
			const existingUser = generateFakeUser({ email: bulkData[1].email });

			let callCount = 0;
			(prisma.user.findFirst as jest.Mock).mockImplementation((args) => {
				if (args.where.email === bulkData[1].email) {
					return Promise.resolve(existingUser);
				}
				return Promise.resolve(null);
			});

			(prisma.user.create as jest.Mock).mockImplementation(() => {
				callCount++;
				return Promise.resolve(generateFakeUser());
			});

			// Act
			const result = await authServices.bulkRegister(bulkData);

			// Assert
			expect(result).toBeDefined();
			expect(result.total).toBe(3);
			expect(result.failed).toBeGreaterThan(0);
		});
	});

	describe("logout", () => {
		it("should logout user successfully", async () => {
			// Arrange
			const userId = generateFakeUUID();
			const { deleteRefreshToken } = require("../../../utils/tokenStore");

			// Act
			await authServices.logout(userId);

			// Assert
			expect(deleteRefreshToken).toHaveBeenCalledWith(userId);
		});
	});

	describe("profile", () => {
		it("should get user profile successfully", async () => {
			// Arrange
			const userId = generateFakeUUID();
			const fakeUser = generateFakeUser({ id: userId });

			(prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);

			// Act
			const result = await authServices.profile(userId);

			// Assert
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { id: userId },
				select: expect.any(Object),
			});
			expect(result).toBeDefined();
		});

		it("should throw error if user not found", async () => {
			// Arrange
			const userId = generateFakeUUID();
			(prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

			// Act & Assert
			await expect(authServices.profile(userId)).rejects.toThrow("User not found");
		});
	});

	describe("getUsers", () => {
		it("should get all users successfully", async () => {
			// Arrange
			const fakeUsers = Array.from({ length: 10 }, () => generateFakeUser());

			(prisma.user.findMany as jest.Mock).mockResolvedValue(fakeUsers);

			// Act
			const result = await authServices.getUsers();

			// Assert
			expect(prisma.user.findMany).toHaveBeenCalled();
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		it("should return empty array if no users found", async () => {
			// Arrange
			(prisma.user.findMany as jest.Mock).mockResolvedValue([]);

			// Act
			const result = await authServices.getUsers();

			// Assert
			expect(result).toEqual([]);
		});
	});
});
