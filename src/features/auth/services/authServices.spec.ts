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
		profile: {
			createMany: jest.fn(),
		},
		refreshToken: {
			create: jest.fn(),
			findFirst: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			deleteMany: jest.fn(),
		},
		$transaction: jest.fn().mockImplementation(async (callback) => {
			const tx = require("../../../configs/database").default;
			return await callback(tx);
		}),
	},
}));

jest.mock("../../../utils/s3", () => ({
	uploadBase64: jest.fn().mockResolvedValue("https://example.com/photo.jpg"),
	getFile: jest.fn().mockReturnValue("https://example.com/photo.jpg"),
	deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../utils/jwt", () => ({
	jwtUtils: {
		generateAccessToken: jest.fn().mockReturnValue("mock-access-token"),
		generateRefreshToken: jest.fn().mockReturnValue("mock-refresh-token"),
		verifyRefreshToken: jest.fn().mockReturnValue({ id: "test-user-id", email: "test@example.com" }),
	},
}));

jest.mock("../../../utils/tokenStore", () => ({
	storeToken: jest.fn().mockResolvedValue(undefined),
	getToken: jest.fn().mockResolvedValue("mock-refresh-token"),
	deleteToken: jest.fn().mockResolvedValue(undefined),
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

			(prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
			(prisma.user.create as jest.Mock).mockResolvedValue(fakeUser);

			// Act
			const result = await authServices.register(registerData);

			// Assert
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
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

			(prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

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

			(prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
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
			const hashedPassword = await encryptPassword("correct-password");
			const fakeUser = generateFakeUser({
				email: loginData.email,
				password: hashedPassword,
			});

			(prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);

			// Act
			const result = await authServices.login(loginData.email, loginData.password);

			// Assert
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: loginData.email },
				include: { profile: true },
			});
			expect(result).toBeDefined();
			expect(result.accessToken).toBe("mock-access-token");
			expect(result.refreshToken).toBe("mock-refresh-token");
		});

		it("should throw error if user not found", async () => {
			// Arrange
			const loginData = generateFakeLoginData();
			(prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

			// Act & Assert
			await expect(authServices.login(loginData.email, loginData.password)).rejects.toThrow("User not found");
		});

		it("should throw error if password is incorrect", async () => {
			// Arrange
			const loginData = generateFakeLoginData();
			const hashedPassword = await encryptPassword("correct-password");
			const fakeUser = generateFakeUser({
				email: loginData.email,
				password: hashedPassword,
			});

			(prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);

			// Act & Assert
			await expect(authServices.login(loginData.email, "wrong-password")).rejects.toThrow();
		});
	});

	describe("bulkRegister", () => {
		it("should register multiple users successfully", async () => {
			// Arrange
			const bulkData = generateBulkRegisterData(5);
			const fakeUsers = bulkData.map((data) => generateFakeUser({ email: data.email }));

			(prisma.user.findMany as jest.Mock).mockResolvedValue([]);
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
			(prisma.user.findMany as jest.Mock).mockImplementation((args) => {
				// return users emails that correspond to existingUser mock in bulk register processing
				return Promise.resolve([{ email: existingUser.email }]);
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
			const { deleteToken } = require("../../../utils/tokenStore");

			// Act
			await authServices.logout(userId);

			// Assert
			expect(deleteToken).toHaveBeenCalledWith(userId, "access");
			expect(deleteToken).toHaveBeenCalledWith(userId, "refresh");
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
