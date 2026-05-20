import { mock, describe, it, expect, beforeAll, beforeEach } from "bun:test";
import { authServices } from "@/features/auth/services/auth.service.js";
import prisma from "@/configs/database.js";
import {
	generateFakeUser,
	generateFakeRegisterData,
	generateFakeLoginData,
	setFakerSeed,
	generateFakeUUID,
} from "__tests__/helpers/faker.helper.js";
import { encryptPassword } from "@/utils/utils.js";

// Mock dependencies
mock.module("@/configs/database.js", () => ({
	default: {
		user: {
			create: mock(),
			findFirst: mock(),
			findUnique: mock(),
			findMany: mock(),
			update: mock(),
			delete: mock(),
			count: mock(),
			createMany: mock(),
		},
		profile: {
			createMany: mock(),
		},
		$transaction: mock().mockImplementation(async (callback) => {
			const db = await import("@/configs/database.js");
			return await callback(db.default);
		}),
	},
}));

mock.module("@/utils/s3.js", () => ({
	uploadBase64: mock().mockResolvedValue({ fileName: "photo.jpg" }),
	getPublicUrl: mock().mockReturnValue("https://example.com/photo.jpg"),
	deleteFile: mock().mockResolvedValue(undefined),
}));

mock.module("@/utils/jwt.js", () => ({
	jwtUtils: {
		generateAccessToken: mock().mockReturnValue("mock-access-token"),
		generateRefreshToken: mock().mockReturnValue("mock-refresh-token"),
		verifyRefreshToken: mock().mockReturnValue({ id: "test-user-id", email: "test@example.com" }),
	},
}));

mock.module("@/utils/tokenStore.js", () => ({
	storeToken: mock().mockResolvedValue(undefined),
	getStoredToken: mock().mockResolvedValue("mock-refresh-token"),
	deleteToken: mock().mockResolvedValue(undefined),
}));

mock.module("@/utils/encryption.js", () => ({
	encryptionUtils: {
		encryptSensitive: mock().mockReturnValue({
			version: "v1",
			ciphertext: "encrypted-data",
		}),
	},
	decryptSensitive: mock().mockReturnValue("decrypted-data"),
}));

mock.module("@/features/auth/jobs/auth.jobs.js", () => ({
	authQueue: {
		add: mock().mockResolvedValue(undefined),
	},
}));

describe("Auth Services", () => {
	beforeAll(() => {
		setFakerSeed(12345);
	});

	beforeEach(() => {
		// Bun mocks are cleared manually if needed, or re-instantiated
	});

	describe("register", () => {
		it("should register a new user successfully", async () => {
			const registerData = generateFakeRegisterData();
			const fakeUser = generateFakeUser({
				email: registerData.email,
			});
			fakeUser.profile = { name: registerData.name };

			(prisma.user.findUnique as any).mockResolvedValue(null);
			(prisma.user.create as any).mockResolvedValue(fakeUser);
			(prisma.role as any) = { findUnique: mock().mockResolvedValue({ id: "role-id" }) };

			const result = await authServices.register(registerData);

			expect(prisma.user.create).toHaveBeenCalled();
			expect(result).toBeDefined();
			expect(result.user.email).toBe(registerData.email);
		});

		it("should throw error if email already exists", async () => {
			const registerData = generateFakeRegisterData();
			const existingUser = generateFakeUser({ email: registerData.email });

			(prisma.user.findUnique as any).mockResolvedValue(existingUser);

			expect(authServices.register(registerData)).rejects.toThrow("Email already exists");
		});
	});

	describe("login", () => {
		it("should login successfully with correct credentials", async () => {
			const loginData = generateFakeLoginData({
				email: "test@example.com",
				password: "correct-password",
			});
			const hashedPassword = await encryptPassword("correct-password");
			const fakeUser = generateFakeUser({
				email: loginData.email,
				password: hashedPassword,
			});
			fakeUser.profile = { name: "Test User" };

			(prisma.user.findUnique as any).mockResolvedValue(fakeUser);

			const result = await authServices.login(loginData.email, loginData.password);

			expect(result).toBeDefined();
			expect(result.accessToken).toBe("mock-access-token");
			expect(result.refreshToken).toBe("mock-refresh-token");
		});

		it("should throw error if user not found", async () => {
			const loginData = generateFakeLoginData();
			(prisma.user.findUnique as any).mockResolvedValue(null);

			expect(authServices.login(loginData.email, loginData.password)).rejects.toThrow("User not found");
		});
	});
});
