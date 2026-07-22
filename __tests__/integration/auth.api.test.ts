import { describe, it, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";


const mockUserFindUnique = mock.fn();
const mockUserFindMany = mock.fn();
const mockUserCreate = mock.fn();
const mockUserCount = mock.fn();
const mockUserUpdate = mock.fn();
const mockUserDelete = mock.fn();
const mockRoleFindUnique = mock.fn();
const mockLogsCreate = mock.fn(() => Promise.resolve());
const mockDisconnect = mock.fn();

const mockPrisma = {
	user: {
		findUnique: mockUserFindUnique,
		findMany: mockUserFindMany,
		create: mockUserCreate,
		count: mockUserCount,
		update: mockUserUpdate,
		delete: mockUserDelete,
	},
	role: {
		findUnique: mockRoleFindUnique,
	},
	logs: {
		create: mockLogsCreate,
	},
	$transaction: (cb: any, ...args: any[]) => {
		return cb(mockPrisma, ...args);
	},
	$disconnect: mockDisconnect,
};

mock.module("@/configs/database.js", {
	exports: { default: mockPrisma },
});

mock.module("@/utils/s3", {
	exports: {
		s3: {},
		isS3Configured: true,
		getPublicUrl: mock.fn(() => null),
		deleteFile: mock.fn(() => undefined),
		getPresignedUploadUrl: mock.fn(() => undefined),
		headFile: mock.fn(() => Promise.resolve(undefined)),
		uploadBase64: mock.fn(() => Promise.resolve({ fileName: "test.jpg", fileUrl: "https://example.com/test.jpg" })),
		getFile: mock.fn(() => "https://example.com/file.jpg"),
		deleteMany: mock.fn(() => Promise.resolve({ deleted: [], errors: [] })),
		deleteByPrefix: mock.fn(() => Promise.resolve({ deleted: 0, errors: 0 })),
		uploadFile: mock.fn(() => Promise.resolve({ fileName: "test.jpg" })),
	},
});

const mockStoreToken = mock.fn(() => Promise.resolve(undefined));
const mockGetStoredToken = mock.fn(() => Promise.resolve("mock-refresh-token"));
const mockDeleteToken = mock.fn(() => Promise.resolve(undefined));

mock.module("@/utils/tokenStore", {
	exports: {
		storeToken: mockStoreToken,
		getStoredToken: mockGetStoredToken,
		deleteToken: mockDeleteToken,
	},
});

mock.module("@/utils/encryption", {
	exports: {
		encryptionUtils: {
			encryptSensitive: mock.fn(() => ({ version: "v1", ciphertext: "encrypted-data" })),
		},
		decryptSensitive: mock.fn(() => "decrypted-data"),
	},
});

mock.module("@/features/auth/jobs/auth.jobs.js", {
	exports: {
		authQueue: {
			add: mock.fn(() => Promise.resolve({ id: "mock-job-id" })),
		},
	},
});

mock.module("@/configs/redis.js", {
	exports: {
		redisState: { client: null, isAvailable: false },
	},
});

mock.module("@/configs/bull.js", {
	exports: {
		bullConnection: {},
	},
});

mock.module("@/middlewares/authMiddleware.js", {
	exports: {
		authenticate: {
			verifyToken: (req: any, _res: any, next: any) => {
				req.user = { id: "test-user-id", email: "test@example.com", roleName: "USER" };
				next();
			},
		},
	},
});

let app: any;

before(async () => {
	const mod = await import("@/configs/express.js");
	app = mod.app;
});

describe("Auth API Integration Tests", () => {
	beforeEach(() => {
		mockUserFindUnique.mock.resetCalls();
		mockUserFindMany.mock.resetCalls();
		mockUserCreate.mock.resetCalls();
		mockUserCount.mock.resetCalls();
		mockRoleFindUnique.mock.resetCalls();
		mockLogsCreate.mock.resetCalls();
		mockStoreToken.mock.resetCalls();
		mockGetStoredToken.mock.resetCalls();
		mockDeleteToken.mock.resetCalls();
		mockUserFindUnique.mock.mockImplementation(() => null);
		mockUserFindMany.mock.mockImplementation(() => []);
		mockUserCount.mock.mockImplementation(() => 0);
		mockUserCreate.mock.mockImplementation(() => undefined);
		mockRoleFindUnique.mock.mockImplementation(() => undefined);
		mockGetStoredToken.mock.mockImplementation(() => Promise.resolve("mock-refresh-token"));
	});

	describe("POST /api/auth/register", () => {
		it("should return 400 if required fields are missing", async () => {
			const response = await request(app).post("/api/auth/register").send({ email: "test@example.com" });

			assert.strictEqual(response.status, 400);
			assert.strictEqual(response.body.success, false);
		});

		it("should register a new user successfully", async () => {
			const registerData = {
				name: "Test User",
				email: "testuser@example.com",
				password: "Test1234!pass",
				phone: "08123456789",
				address: "Jl. Test No. 123",
			};
			const fakeUser = {
				id: "user-id-123",
				email: registerData.email,
				profile: { name: registerData.name, phone: registerData.phone, address: registerData.address, photo: null, NIK: null },
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			mockRoleFindUnique.mock.mockImplementation(() => ({ id: "role-id", name: "USER" }));
			mockUserCreate.mock.mockImplementation(() => fakeUser);

			const response = await request(app).post("/api/auth/register").send(registerData);

			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.body.success, true);
			assert.strictEqual(response.body.message, "Berhasil register");
			assert.ok(response.body.data);
			assert.ok(response.body.data.accessToken);
			assert.ok(response.body.data.refreshToken);
		});

		it("should return error if email already exists", async () => {
			mockUserFindUnique.mock.mockImplementation(() => ({ id: "existing-id", email: "already@example.com" }));

			const response = await request(app).post("/api/auth/register").send({
				name: "Test User",
				email: "already@example.com",
				password: "Test1234!pass",
				phone: "08123456789",
				address: "Jl. Test No. 123",
			});

			assert.strictEqual(response.status, 400);
			assert.strictEqual(response.body.success, false);
			assert.strictEqual(response.body.message, "Email sudah terdaftar");
		});
	});

	describe("POST /api/auth/login", () => {
		it("should return 400 if credentials are missing", async () => {
			const response = await request(app).post("/api/auth/login").send({ email: "test@example.com" });

			assert.strictEqual(response.status, 400);
			assert.strictEqual(response.body.success, false);
		});

		it("should login successfully with valid credentials", async () => {
			const loginData = { email: "test@example.com", password: "Test1234!pass" };

			const { encryptPassword } = await import("@/utils/utils.js");
			const hashedPassword = await encryptPassword(loginData.password);

			const fakeUser = {
				id: "user-id-123",
				email: loginData.email,
				password: hashedPassword,
				profile: { name: "Test User", photo: null },
			};

			mockUserFindUnique.mock.mockImplementation(() => fakeUser);

			const response = await request(app).post("/api/auth/login").send({
				email: loginData.email,
				password: loginData.password,
			});

			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.body.success, true);
			assert.strictEqual(response.body.message, "Berhasil login");
			assert.ok(response.body.data.accessToken);
			assert.ok(response.body.data.refreshToken);
		});

		it("should return error if user not found", async () => {
			const response = await request(app).post("/api/auth/login").send({
				email: "nonexistent@example.com",
				password: "Test1234!pass",
			});

			assert.strictEqual(response.status, 400);
			assert.strictEqual(response.body.success, false);
		});
	});

	describe("POST /api/auth/refresh-token", () => {
		it("should return 400 if refresh token is missing", async () => {
			const response = await request(app).post("/api/auth/refresh-token").send({});

			assert.strictEqual(response.status, 400);
			assert.strictEqual(response.body.success, false);
		});

		it("should refresh token successfully", async () => {
			const { jwtUtils } = await import("@/utils/jwt.js");
			const mockUser = {
				id: "user-id-123",
				email: "test@example.com",
				isActive: true,
				profile: { name: "Test User", NIK: null, phone: null, photo: null, address: null },
				role: { name: "USER" },
			};

			const validRefreshToken = jwtUtils.generateRefreshToken({ id: mockUser.id, email: mockUser.email });

			mockGetStoredToken.mock.mockImplementation(() => Promise.resolve(validRefreshToken));
			mockUserFindUnique.mock.mockImplementation(() => mockUser);

			const response = await request(app).post("/api/auth/refresh-token").send({
				refreshToken: validRefreshToken,
			});

			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.body.success, true);
			assert.strictEqual(response.body.message, "Berhasil refresh token");
			assert.ok(response.body.data.accessToken);
			assert.ok(response.body.data.refreshToken);
		});
	});

	describe("POST /api/auth/forgot-password", () => {
		it("should return 400 if email is missing", async () => {
			const response = await request(app).post("/api/auth/forgot-password").send({});

			assert.strictEqual(response.status, 400);
			assert.strictEqual(response.body.success, false);
		});

		it("should send forgot password email successfully", async () => {
			const mockUser = {
				id: "user-id-123",
				email: "test@example.com",
				profile: { name: "Test User" },
			};

			mockUserFindUnique.mock.mockImplementation(() => mockUser);

			const response = await request(app).post("/api/auth/forgot-password").send({
				email: mockUser.email,
			});

			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.body.success, true);
			assert.strictEqual(response.body.message, "Berhasil kirim email");
		});
	});
});
