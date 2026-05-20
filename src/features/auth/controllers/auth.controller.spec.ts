/**
 * Unit Test untuk Auth Controllers
 * Menggunakan @faker-js/faker untuk dummy data
 */
import { describe, it, expect, beforeAll, mock } from "bun:test";
import { authController } from "@/features/auth/controllers/auth.controller.js";
import { createMockRequest, createMockResponse, createMockAuthenticatedUser } from "__tests__/helpers/mock.helper.js";
import {
	generateFakeUser,
	generateFakeRegisterData,
	generateFakeLoginData,
	generateFakeTokens,
	setFakerSeed,
} from "__tests__/helpers/faker.helper.js";
import { HttpStatus } from "@/utils/respons.js";

mock.module("@/features/auth/services/auth.service.js", () => ({
	authServices: {
		register: mock(),
		login: mock(),
		logout: mock(),
		refreshToken: mock(),
		profile: mock(),
		forgotPassword: mock(),
		getUsers: mock(),
		updateProfile: mock(),
		deleteProfile: mock(),
	},
}));

import { authServices } from "@/features/auth/services/auth.service.js";

describe("Auth Controllers", () => {
	beforeAll(() => {
		setFakerSeed(12345);
	});

	describe("register", () => {
		it("should register user successfully", async () => {
			const registerData = generateFakeRegisterData();
			const fakeUser = generateFakeUser({ email: registerData.email });
			const req = createMockRequest({ body: registerData });
			const res = createMockResponse();

			(authServices.register as any).mockResolvedValue(fakeUser);

			await authController.register(req as any, res as any);

			expect(authServices.register).toHaveBeenCalledWith(
				expect.objectContaining({
					email: registerData.email,
					name: registerData.name,
				}),
			);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					message: "Berhasil register",
				}),
			);
		});

		it("should return error if required fields are missing", async () => {
			const req = createMockRequest({
				body: { email: "test@example.com" },
			});
			const res = createMockResponse();

			await authController.register(req as any, res as any);

			expect(authServices.register).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: false,
					message: "Name is required",
				}),
			);
		});

		it("should handle duplicate email error", async () => {
			const registerData = generateFakeRegisterData();
			const req = createMockRequest({ body: registerData });
			const res = createMockResponse();

			(authServices.register as any).mockRejectedValue(new Error("Email already exists"));

			await authController.register(req as any, res as any);

			expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: false,
					message: "Email sudah terdaftar",
				}),
			);
		});
	});

	describe("login", () => {
		it("should login successfully with valid credentials", async () => {
			const loginData = generateFakeLoginData();
			const tokens = generateFakeTokens();
			const req = createMockRequest({ body: loginData });
			const res = createMockResponse();

			(authServices.login as any).mockResolvedValue(tokens);

			await authController.login(req as any, res as any);

			expect(authServices.login).toHaveBeenCalledWith(loginData.email, loginData.password);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					message: "Berhasil login",
				}),
			);
		});

		it("should return error if credentials are missing", async () => {
			const req = createMockRequest({
				body: { email: "test@example.com" },
			});
			const res = createMockResponse();

			await authController.login(req as any, res as any);

			expect(authServices.login).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
		});

		it("should handle invalid credentials error", async () => {
			const loginData = generateFakeLoginData();
			const req = createMockRequest({ body: loginData });
			const res = createMockResponse();

			(authServices.login as any).mockRejectedValue(new Error("User not found"));

			await authController.login(req as any, res as any);

			expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: false,
					message: "User tidak ditemukan",
				}),
			);
		});
	});

	describe("logout", () => {
		it("should logout successfully", async () => {
			const authenticatedUser = createMockAuthenticatedUser();
			const req = createMockRequest({ user: authenticatedUser });
			const res = createMockResponse();

			(authServices.logout as any).mockResolvedValue(undefined);

			await authController.logout(req as any, res as any);

			expect(authServices.logout).toHaveBeenCalledWith(authenticatedUser.id);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					message: "Berhasil logout",
				}),
			);
		});
	});

	describe("refreshToken", () => {
		it("should refresh token successfully", async () => {
			const oldToken = "old-refresh-token";
			const newTokens = generateFakeTokens();
			const req = createMockRequest({ body: { refreshToken: oldToken } });
			const res = createMockResponse();

			(authServices.refreshToken as any).mockResolvedValue(newTokens);

			await authController.refreshToken(req as any, res as any);

			expect(authServices.refreshToken).toHaveBeenCalledWith(oldToken);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
		});

		it("should return error if refresh token is missing", async () => {
			const req = createMockRequest({ body: {} });
			const res = createMockResponse();

			await authController.refreshToken(req as any, res as any);

			expect(authServices.refreshToken).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
		});
	});

	describe("profile", () => {
		it("should get profile successfully", async () => {
			const authenticatedUser = createMockAuthenticatedUser();
			const fakeUser = generateFakeUser({ id: authenticatedUser.id });
			const req = createMockRequest({ user: authenticatedUser });
			const res = createMockResponse();

			(authServices.profile as any).mockResolvedValue(fakeUser);

			await authController.profile(req as any, res as any);

			expect(authServices.profile).toHaveBeenCalledWith(authenticatedUser.id);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					data: fakeUser,
				}),
			);
		});
	});

	describe("forgotPassword", () => {
		it("should send forgot password email successfully", async () => {
			const email = "test@example.com";
			const req = createMockRequest({ body: { email } });
			const res = createMockResponse();

			(authServices.forgotPassword as any).mockResolvedValue(undefined);

			await authController.forgotPassword(req as any, res as any);

			expect(authServices.forgotPassword).toHaveBeenCalledWith(email);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
		});

		it("should return error if email is missing", async () => {
			const req = createMockRequest({ body: {} });
			const res = createMockResponse();

			await authController.forgotPassword(req as any, res as any);

			expect(authServices.forgotPassword).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
		});
	});

	describe("getUsers", () => {
		it("should get all users successfully", async () => {
			const fakeUsers = Array.from({ length: 5 }, () => generateFakeUser());
			const req = createMockRequest();
			const res = createMockResponse();

			(authServices.getUsers as any).mockResolvedValue(fakeUsers);

			await authController.getUsers(req as any, res as any);

			expect(authServices.getUsers).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					data: fakeUsers,
				}),
			);
		});
	});

	describe("updateProfile", () => {
		it("should update profile successfully", async () => {
			const authenticatedUser = createMockAuthenticatedUser();
			const updateData = { name: "New Name" };
			const req = createMockRequest({ user: authenticatedUser, body: updateData });
			const res = createMockResponse();

			(authServices.updateProfile as any).mockResolvedValue(undefined);

			await authController.updateProfile(req as any, res as any);

			expect(authServices.updateProfile).toHaveBeenCalledWith(authenticatedUser.id, updateData);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					message: "Berhasil update profile",
				}),
			);
		});
	});

	describe("deleteProfile", () => {
		it("should delete profile successfully", async () => {
			const profileId = "profile-to-delete";
			const req = createMockRequest({ params: { id: profileId } });
			const res = createMockResponse();

			(authServices.deleteProfile as any).mockResolvedValue(undefined);

			await authController.deleteProfile(req as any, res as any);

			expect(authServices.deleteProfile).toHaveBeenCalledWith(profileId);
			expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					message: "Berhasil menghapus profile",
				}),
			);
		});

		it("should return error if id is missing", async () => {
			const req = createMockRequest({ params: {} });
			const res = createMockResponse();

			await authController.deleteProfile(req as any, res as any);

			expect(authServices.deleteProfile).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
		});
	});
});
