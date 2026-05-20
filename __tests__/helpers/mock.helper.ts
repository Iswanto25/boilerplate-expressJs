/**
 * Mock helpers untuk testing menggunakan Bun:test
 * Menyediakan mock objects untuk dependencies seperti Prisma, Request, Response, dll
 */

import { Request, Response } from "express";
import { mock } from "bun:test";

/**
 * Create mock Express Request
 */
export const createMockRequest = (overrides?: Partial<Request>): Partial<Request> => {
	return {
		body: {},
		params: {},
		query: {},
		headers: {},
		user: undefined,
		...overrides,
	} as any;
};

/**
 * Create mock Express Response
 */
export const createMockResponse = (): Partial<Response> => {
	const res: Partial<Response> = {
		status: mock().mockReturnThis(),
		json: mock().mockReturnThis(),
		send: mock().mockReturnThis(),
		setHeader: mock().mockReturnThis(),
	};
	return res as any;
};

/**
 * Mock Prisma Client
 */
export const createMockPrismaClient = (): any => {
	return {
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
		$transaction: mock((callback: any) => callback(createMockPrismaClient())),
		$disconnect: mock(),
	};
};

/**
 * Mock Redis Client
 */
export const createMockRedisClient = () => {
	return {
		get: mock(),
		set: mock(),
		del: mock(),
		setex: mock(),
		ttl: mock(),
		exists: mock(),
		flushall: mock(),
		disconnect: mock(),
	};
};

/**
 * Mock S3 Client
 */
export const createMockS3Client = () => {
	return {
		uploadBase64: mock(),
		getPublicUrl: mock(),
		deleteFile: mock(),
	};
};

/**
 * Mock JWT utilities
 */
export const createMockJWT = () => {
	return {
		generateAccessToken: mock(),
		generateRefreshToken: mock(),
		verifyAccessToken: mock(),
		verifyRefreshToken: mock(),
	};
};

/**
 * Mock SMTP utilities
 */
export const createMockSMTP = () => {
	return {
		sendMail: mock(),
		generateOTPEmail: mock(),
	};
};

/**
 * Mock encryption utilities
 */
export const createMockEncryption = () => {
	return {
		encrypt: mock(),
		decrypt: mock(),
		encryptSensitive: mock(),
		decryptSensitive: mock(),
	};
};

/**
 * Helper to wait for promises to resolve
 */
export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Helper to create mock authenticated user
 */
export const createMockAuthenticatedUser = (overrides?: any) => {
	return {
		id: "test-user-id-123",
		email: "test@example.com",
		name: "Test User",
		roleId: "role-123",
		...overrides,
	};
};
