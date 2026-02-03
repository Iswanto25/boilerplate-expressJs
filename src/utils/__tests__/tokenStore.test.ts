import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { createRequire } from "node:module";
import path from "node:path";

const requireModule = createRequire(__filename);
const modulePath = "../tokenStore";
const redisPath = path.join(__dirname, "../../configs/redis");

const stubModule = (specifier: string, exports: any): (() => void) => {
	const resolved = requireModule.resolve(specifier);
	const original = requireModule.cache[resolved];
	(requireModule.cache as any)[resolved] = {
		id: resolved,
		filename: resolved,
		loaded: true,
		exports,
	};
	return () => {
		if (original) {
			(requireModule.cache as any)[resolved] = original;
		} else {
			delete requireModule.cache[resolved];
		}
	};
};

const setupModule = async (overrides?: Partial<Record<string, any>>) => {
	const redisClient: any = {
		set: mock.fn(async () => "OK"),
		get: mock.fn(async () => null),
		del: mock.fn(async () => 1),
		...(overrides || {}),
	};

	const restoreRedis = stubModule(redisPath, { redisClient });
	delete requireModule.cache[requireModule.resolve(modulePath)];

	const module = await import(modulePath);
	return {
		module,
		redisClient,
		restore: () => {
			restoreRedis();
			delete requireModule.cache[requireModule.resolve(modulePath)];
		},
	};
};

test("storeToken persists token with the correct prefix", async () => {
	const { module, redisClient, restore } = await setupModule();
	try {
		const key = await module.storeToken("user-1", "token-value", "access", 120);

		assert.equal(key, "access_token:user-1");
		assert.deepEqual(redisClient.set.mock.calls[0].arguments, ["access_token:user-1", "token-value", "EX", 120]);
	} finally {
		restore();
	}
});

test("storeToken throws when Redis does not acknowledge write", async () => {
	const { module, restore } = await setupModule({
		set: mock.fn(async () => "ERR"),
	});
	try {
		await assert.rejects(() => module.storeToken("user-2", "token", "refresh", 60), /Failed to store token/);
	} finally {
		restore();
	}
});

test("getStoredToken reads token from Redis", async () => {
	const { module, redisClient, restore } = await setupModule({
		get: mock.fn(async () => "stored-token"),
	});

	try {
		const result = await module.getStoredToken("user-3", "access");
		assert.equal(result, "stored-token");
		assert.deepEqual(redisClient.get.mock.calls[0].arguments, ["access_token:user-3"]);
	} finally {
		restore();
	}
});

test("deleteToken removes token key", async () => {
	const { module, redisClient, restore } = await setupModule();
	try {
		await module.deleteToken("user-4", "refresh");
		assert.deepEqual(redisClient.del.mock.calls[0].arguments, ["refresh_token:user-4"]);
	} finally {
		restore();
	}
});
