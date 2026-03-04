/**
 * Mock helpers untuk testing
 * Menyediakan mock objects untuk dependencies seperti Prisma, Request, Response, dll
 */

import { Request, Response } from "express";

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
	};
};

/**
 * Create mock Express Response
 */
export const createMockResponse = (): Partial<Response> => {
	const res: Partial<Response> = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
		setHeader: jest.fn().mockReturnThis(),
	};
	return res;
};

/**
 * Mock Prisma Client
 */
export const createMockPrismaClient = (): any => {
	return {
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
		$transaction: jest.fn((callback) => callback(createMockPrismaClient())),
		$disconnect: jest.fn(),
	};
};

/**
 * Mock Redis Client
 */
export const createMockRedisClient = () => {
	return {
		get: jest.fn(),
		set: jest.fn(),
		del: jest.fn(),
		setex: jest.fn(),
		ttl: jest.fn(),
		exists: jest.fn(),
		flushall: jest.fn(),
		disconnect: jest.fn(),
	};
};

/**
 * Mock S3 Client
 */
export const createMockS3Client = () => {
	return {
		uploadBase64: jest.fn(),
		getFile: jest.fn(),
		deleteFile: jest.fn(),
	};
};

/**
 * Mock JWT utilities
 */
export const createMockJWT = () => {
	return {
		generateAccessToken: jest.fn(),
		generateRefreshToken: jest.fn(),
		verifyAccessToken: jest.fn(),
		verifyRefreshToken: jest.fn(),
	};
};

/**
 * Mock SMTP utilities
 */
export const createMockSMTP = () => {
	return {
		sendMail: jest.fn(),
		generateOTPEmail: jest.fn(),
	};
};

/**
 * Mock encryption utilities
 */
export const createMockEncryption = () => {
	return {
		encrypt: jest.fn(),
		decrypt: jest.fn(),
		encryptSensitive: jest.fn(),
		decryptSensitive: jest.fn(),
	};
};

/**
 * Helper to wait for promises to resolve
 */
export const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

/**
 * Helper to create mock authenticated user
 */
export const createMockAuthenticatedUser = (overrides?: any) => {
	return {
		id: "test-user-id-123",
		email: "test@example.com",
		name: "Test User",
		role: "user",
		...overrides,
	};
};
