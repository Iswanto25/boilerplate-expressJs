import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { createRequire } from "node:module";
import path from "node:path";

const requireModule = createRequire(__filename);
const modulePath = "../rateLimiter";
const redisPath = path.join(__dirname, "../../configs/redis");
const responsPath = path.join(__dirname, "../respons");
const loggerPath = path.join(__dirname, "../logger");

const stubModule = (specifier: string, exports: any): (() => void) => {
	const resolvedPath = requireModule.resolve(specifier);
	const original = requireModule.cache[resolvedPath];
	(requireModule.cache as any)[resolvedPath] = {
		id: resolvedPath,
		filename: resolvedPath,
		loaded: true,
		exports,
	};
	return () => {
		if (original) {
			(requireModule.cache as any)[resolvedPath] = original;
		} else {
			delete requireModule.cache[resolvedPath];
		}
	};
};

const setup = async (overrides?: Partial<Record<"incr" | "expire" | "ttl" | "set", (...args: any[]) => any>>) => {
	const redisClient: any = {
		incr: mock.fn(async () => 1),
		expire: mock.fn(async () => true),
		ttl: mock.fn(async () => 30),
		set: mock.fn(async () => "OK"),
		...(overrides || {}),
	};

	const responsError = mock.fn((_message, _detail, code: number, res: any) => {
		res.status(code).json({ message: _message, detail: _detail, code });
	});

	const logger: any = {
		warn: mock.fn(() => {}),
		error: mock.fn(() => {}),
	};

	const restoreRedis = stubModule(redisPath, { redisClient, isRedisAvailable: true });
	const restoreRespons = stubModule(responsPath, {
		HttpStatus: { TOO_MANY_REQUESTS: 429 },
		respons: { error: responsError },
	});
	const restoreLogger = stubModule(loggerPath, { logger });

	delete requireModule.cache[requireModule.resolve(modulePath)];
	const rateLimiterModule = await import(modulePath);

	return {
		rateLimiterModule,
		redisClient,
		responsError,
		logger,
		restore: () => {
			restoreRedis();
			restoreRespons();
			restoreLogger();
			delete requireModule.cache[requireModule.resolve(modulePath)];
		},
	};
};

const createReqRes = () => {
	const req: any = {
		headers: {},
		socket: { remoteAddress: "127.0.0.1" },
		user: { id: "user-1" },
		protocol: "http",
		get: () => "localhost",
		originalUrl: "/api",
		method: "GET",
	};

	const res: any = {
		statusCode: 0,
		payload: null,
		status(code: number) {
			this.statusCode = code;
			return this;
		},
		json(body: any) {
			this.payload = body;
			return this;
		},
	};

	return { req, res };
};

test("rateLimiter allows requests under the threshold", async () => {
	const { rateLimiterModule, redisClient, responsError, restore } = await setup();
	const middleware = rateLimiterModule.rateLimiter({ maxRequests: 5, windowInSeconds: 60 });

	const { req, res } = createReqRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	try {
		await middleware(req, res, next);

		assert.equal(nextCalled, true);
		assert.equal(redisClient.incr.mock.calls.length, 1);
		assert.equal(responsError.mock.calls.length, 0);
	} finally {
		restore();
	}
});

test("rateLimiter blocks when exceeding the limit", async () => {
	const { rateLimiterModule, redisClient, responsError, restore } = await setup({
		incr: mock.fn(async () => 6),
		ttl: mock.fn(async () => 25),
	});

	const middleware = rateLimiterModule.rateLimiter({ maxRequests: 5, windowInSeconds: 60 });
	const { req, res } = createReqRes();

	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	try {
		await middleware(req, res, next);

		assert.equal(nextCalled, false);
		assert.equal(res.statusCode, 429);
		assert.equal(redisClient.set.mock.calls.length, 1);
		assert.equal(responsError.mock.calls.length, 1);
		assert.equal(res.payload.message, "Terlalu banyak permintaan");
	} finally {
		restore();
	}
});

test("rateLimiter logs errors and calls next when Redis throws", async () => {
	const error = new Error("redis down");
	const { rateLimiterModule, logger, restore } = await setup({
		incr: mock.fn(async () => {
			throw error;
		}),
	});

	const middleware = rateLimiterModule.rateLimiter({ maxRequests: 5, windowInSeconds: 60 });
	const { req, res } = createReqRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	try {
		await middleware(req, res, next);

		assert.equal(nextCalled, true);
		assert.equal(logger.warn.mock.calls.length, 1);
	} finally {
		restore();
	}
});
