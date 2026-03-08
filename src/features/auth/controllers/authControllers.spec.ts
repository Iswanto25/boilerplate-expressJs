/**
 * Unit Test untuk Auth Controllers
 * Menggunakan @faker-js/faker untuk dummy data
 */
import { authController } from "./authControllers.js";
import { authServices } from "@/features/auth/services/authServices.js";
import { createMockRequest, createMockResponse, createMockAuthenticatedUser } from "__tests__/helpers/mock.helper.js";
import {
	generateFakeUser,
	generateFakeRegisterData,
	generateFakeLoginData,
	generateBulkRegisterData,
	generateFakeTokens,
	setFakerSeed,
} from "__tests__/helpers/faker.helper.js";
import { HttpStatus } from "@/utils/respons.js";

// Mock auth services
jest.mock("@/features/auth/services/authServices.js", () => ({
	authServices: {
		register: jest.fn(),
		login: jest.fn(),
		logout: jest.fn(),
		refreshToken: jest.fn(),
		profile: jest.fn(),
		forgotPassword: jest.fn(),
		bulkRegister: jest.fn(),
		getUsers: jest.fn(),
	},
}));

describe("Auth Controllers", () => {
	beforeAll(() => {
		setFakerSeed(12345);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("register", () => {
		it("should register user successfully", async () => {
			// Arrange
			const registerData = generateFakeRegisterData();
			const fakeUser = generateFakeUser({ email: registerData.email });
			const req = createMockRequest({ body: registerData });
			const res = createMockResponse();

			(authServices.register as jest.Mock).mockResolvedValue(fakeUser);

			// Act
			await authController.register(req as any, res as any);

			// Assert
			expect(authServices.register).toHaveBeenCalledWith(
				expect.objectContaining({
					email: registerData.email,
					name: registerData.name,
				}),
			);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "success",
					message: "Berhasil register",
				}),
			);
		});

		it("should return error if required fields are missing", async () => {
			// Arrange
			const req = createMockRequest({
				body: { email: "test@example.com" }, // missing name and password
			});
			const res = createMockResponse();

			// Act
			await authController.register(req as any, res as any);

			// Assert
			expect(authServices.register).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "error",
					message: "Data tidak lengkap",
				}),
			);
		});

		it("should handle duplicate email error", async () => {
			// Arrange
			const registerData = generateFakeRegisterData();
			const req = createMockRequest({ body: registerData });
			const res = createMockResponse();

			(authServices.register as jest.Mock).mockRejectedValue(new Error("Email already exists"));

			// Act
			await authController.register(req as any, res as any);

			// Assert
			expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "error",
					message: "Email sudah terdaftar",
				}),
			);
		});
	});

	describe("login", () => {
		it("should login successfully with valid credentials", async () => {
			// Arrange
			const loginData = generateFakeLoginData();
			const tokens = generateFakeTokens();
			const req = createMockRequest({ body: loginData });
			const res = createMockResponse();

			(authServices.login as jest.Mock).mockResolvedValue(tokens);

			// Act
			await authController.login(req as any, res as any);

			// Assert
			expect(authServices.login).toHaveBeenCalledWith(loginData.email, loginData.password);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "success",
					message: "Berhasil login",
				}),
			);
		});

		it("should return error if credentials are missing", async () => {
			// Arrange
			const req = createMockRequest({
				body: { email: "test@example.com" }, // missing password
			});
			const res = createMockResponse();

			// Act
			await authController.login(req as any, res as any);

			// Assert
			expect(authServices.login).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
		});

		it("should handle invalid credentials error", async () => {
			// Arrange
			const loginData = generateFakeLoginData();
			const req = createMockRequest({ body: loginData });
			const res = createMockResponse();

			(authServices.login as jest.Mock).mockRejectedValue(new Error("User not found"));

			// Act
			await authController.login(req as any, res as any);

			// Assert
			expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "error",
					message: "User tidak ditemukan",
				}),
			);
		});
	});

	describe("logout", () => {
		it("should logout successfully", async () => {
			// Arrange
			const authenticatedUser = createMockAuthenticatedUser();
			const req = createMockRequest({ user: authenticatedUser });
			const res = createMockResponse();

			(authServices.logout as jest.Mock).mockResolvedValue(undefined);

			// Act
			await authController.logout(req as any, res as any);

			// Assert
			expect(authServices.logout).toHaveBeenCalledWith(authenticatedUser.id);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "success",
					message: "Berhasil logout",
				}),
			);
		});
	});

	describe("refreshToken", () => {
		it("should refresh token successfully", async () => {
			// Arrange
			const oldToken = "old-refresh-token";
			const newTokens = generateFakeTokens();
			const req = createMockRequest({ body: { refreshToken: oldToken } });
			const res = createMockResponse();

			(authServices.refreshToken as jest.Mock).mockResolvedValue(newTokens);

			// Act
			await authController.refreshToken(req as any, res as any);

			// Assert
			expect(authServices.refreshToken).toHaveBeenCalledWith(oldToken);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
		});

		it("should return error if refresh token is missing", async () => {
			// Arrange
			const req = createMockRequest({ body: {} });
			const res = createMockResponse();

			// Act
			await authController.refreshToken(req as any, res as any);

			// Assert
			expect(authServices.refreshToken).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
		});
	});

	describe("profile", () => {
		it("should get profile successfully", async () => {
			// Arrange
			const authenticatedUser = createMockAuthenticatedUser();
			const fakeUser = generateFakeUser({ id: authenticatedUser.id });
			const req = createMockRequest({ user: authenticatedUser });
			const res = createMockResponse();

			(authServices.profile as jest.Mock).mockResolvedValue(fakeUser);

			// Act
			await authController.profile(req as any, res as any);

			// Assert
			expect(authServices.profile).toHaveBeenCalledWith(authenticatedUser.id);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "success",
					data: fakeUser,
				}),
			);
		});
	});

	describe("forgotPassword", () => {
		it("should send forgot password email successfully", async () => {
			// Arrange
			const email = "test@example.com";
			const req = createMockRequest({ body: { email } });
			const res = createMockResponse();

			(authServices.forgotPassword as jest.Mock).mockResolvedValue(undefined);

			// Act
			await authController.forgotPassword(req as any, res as any);

			// Assert
			expect(authServices.forgotPassword).toHaveBeenCalledWith(email);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
		});

		it("should return error if email is missing", async () => {
			// Arrange
			const req = createMockRequest({ body: {} });
			const res = createMockResponse();

			// Act
			await authController.forgotPassword(req as any, res as any);

			// Assert
			expect(authServices.forgotPassword).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
		});
	});

	describe("getUsers", () => {
		it("should get all users successfully", async () => {
			// Arrange
			const fakeUsers = Array.from({ length: 5 }, () => generateFakeUser());
			const req = createMockRequest();
			const res = createMockResponse();

			(authServices.getUsers as jest.Mock).mockResolvedValue(fakeUsers);

			// Act
			await authController.getUsers(req as any, res as any);

			// Assert
			expect(authServices.getUsers).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "success",
					data: fakeUsers,
				}),
			);
		});
	});
});
