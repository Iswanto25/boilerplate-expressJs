/**
 * Bun:test — Validasi Koneksi Database & Redis setelah migrasi ke Bun
 * Jalankan dengan: bun test __tests__/infrastructure/
 */
import { describe, it, expect, beforeAll } from "bun:test";
import prisma from "@/configs/database.js";
import { redisState } from "@/configs/redis.js";

describe("Infrastructure Connectivity (Bun Runtime)", () => {
	describe("Prisma Database", () => {
		it("should connect and execute raw query", async () => {
			const result = await prisma.$queryRaw<[{ "?column?": number }]>`SELECT 1`;
			expect(result).toBeDefined();
			expect(result[0]).toBeDefined();
		});

		it("should be able to count users table", async () => {
			const count = await prisma.user.count();
			expect(typeof count).toBe("number");
			expect(count).toBeGreaterThanOrEqual(0);
		});

		it("should disconnect cleanly", async () => {
			await prisma.$disconnect();
			// Reconnect after disconnect to avoid affecting other tests
			await prisma.$connect();
		});
	});

	describe("Redis", () => {
		beforeAll(async () => {
			// Tunggu Redis connect jika lazy
			if (redisState.client && redisState.client.status !== "ready") {
				try {
					await redisState.client.connect();
				} catch {
					// Redis not available — skip silently
				}
			}
		});

		it("should have Redis client initialized or gracefully unavailable", () => {
			if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
				// No Redis config — skip
				return;
			}

			expect(redisState.client).toBeDefined();
		});

		it("should be able to ping Redis when available", async () => {
			if (!redisState.client || !redisState.isAvailable) {
				// Redis not available — skip gracefully
				return;
			}

			const pong = await redisState.client.ping();
			expect(pong).toBe("PONG");
		});

		it("should set and get a test key when available", async () => {
			if (!redisState.client || !redisState.isAvailable) {
				return;
			}

			const testKey = "bun:test:infrastructure";
			const testValue = `Bun v${Bun.version}`;

			await redisState.client.set(testKey, testValue, "EX", 10);
			const result = await redisState.client.get(testKey);

			expect(result).toBe(testValue);

			// Cleanup
			await redisState.client.del(testKey);
		});
	});
});
