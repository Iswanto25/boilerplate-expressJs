import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { createRequire } from "node:module";
import path from "node:path";

const requireModule = createRequire(__filename);
const modulePath = "../respons";
const prismaPath = path.join(__dirname, "../../configs/database");
const authPath = path.join(__dirname, "../../middlewares/authMiddleware");
const loggerPath = path.join(__dirname, "../logger");

const stubModule = (resolved: string, exports: any): (() => void) => {
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

const createReqRes = (token: string = "token-123") => {
	const req: any = {
		headers: {
			authorization: `Bearer ${token}`,
			"x-forwarded-for": "203.0.113.1",
			"user-agent": "UnitTestAgent/1.0",
		},
		socket: { remoteAddress: "10.0.0.1" },
		get: () => "localhost",
		protocol: "http",
		originalUrl: "/api/test",
		method: "POST",
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

const setup = async (overrides?: {
	auth?: ReturnType<typeof mock.fn>;
	findUser?: ReturnType<typeof mock.fn>;
	createLog?: ReturnType<typeof mock.fn>;
}) => {
	const findUser = overrides?.findUser ?? mock.fn(async () => ({ id: "user-1", name: "Tester", role: "admin" }));
	const createLog = overrides?.createLog ?? mock.fn(async () => ({}));
	const auth = overrides?.auth ?? mock.fn(async () => ({ valid: true, userId: "user-1" }));

	const restorePrisma = stubModule(prismaPath, {
		default: {
			user: { findUnique: findUser },
			logs: { create: createLog },
		},
	});

	const restoreAuth = stubModule(authPath, {
		authenticate: { checkToken: auth },
	});

	const logger: any = {
		info: mock.fn(() => {}),
		warn: mock.fn(() => {}),
		error: mock.fn(() => {}),
	};
	const restoreLogger = stubModule(loggerPath, { logger });

	delete requireModule.cache[requireModule.resolve(modulePath)];
	const module = await import(modulePath);

	const restoreAll = () => {
		restorePrisma();
		restoreAuth();
		restoreLogger();
	};

	return { module, findUser, createLog, auth, logger, restoreAll };
};

test("respons.success logs and responds with payload", async () => {
	const { module, findUser, createLog, logger, restoreAll } = await setup();
	const { req, res } = createReqRes();

	try {
		await module.respons.success("Success message", { hello: "world" }, module.HttpStatus.OK, res, req);

		assert.equal(res.statusCode, 200);
		assert.deepEqual(res.payload, {
			status: 200,
			message: "Success message",
			data: { hello: "world" },
		});

		assert.equal(findUser.mock.calls.length, 1);
		assert.equal(createLog.mock.calls.length, 1);
		assert.equal(logger.info.mock.calls.length, 1);
		assert.equal(logger.warn.mock.calls.length, 0);
		assert.equal(logger.error.mock.calls.length, 0);
	} finally {
		restoreAll();
	}
});

test("respons.error logs warning when database write fails", async () => {
	const failingLog = mock.fn(async () => {
		throw new Error("db failure");
	});

	const { module, logger, restoreAll } = await setup({ createLog: failingLog });
	const { req, res } = createReqRes();

	try {
		await module.respons.error("Error message", { reason: "failure" }, module.HttpStatus.BAD_REQUEST, res, req);

		assert.equal(res.statusCode, 400);
		assert.deepEqual(res.payload, {
			status: 400,
			message: "Error message",
			error: { reason: "failure" },
		});

		assert.equal(logger.error.mock.calls.length, 1);
		assert.equal(logger.warn.mock.calls.length, 1);
	} finally {
		restoreAll();
	}
});
