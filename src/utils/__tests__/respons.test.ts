import { test, describe, expect, mock } from "bun:test";
import { createRequire } from "node:module";

const requireModule = createRequire(import.meta.url);
const modulePath = "@/utils/respons";
const prismaPath = "@/configs/database";
const authPath = "@/middlewares/authMiddleware";
const loggerPath = "@/utils/logger";

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

const setup = async (overrides?: { auth?: ReturnType<typeof mock>; findUser?: ReturnType<typeof mock>; createLog?: ReturnType<typeof mock> }) => {
	const findUser = overrides?.findUser ?? mock(async () => ({ id: "user-1", name: "Tester", role: "admin" }));
	const createLog = overrides?.createLog ?? mock(async () => ({}));
	const auth = overrides?.auth ?? mock(async () => ({ valid: true, userId: "user-1" }));

	const restorePrisma = stubModule(prismaPath, {
		__esModule: true,
		default: {
			user: { findUnique: findUser },
			logs: { create: createLog },
		},
	});

	const restoreAuth = stubModule(authPath, {
		authenticate: { checkToken: auth },
	});

	const logger: any = {
		info: mock(() => {}),
		warn: mock(() => {}),
		error: mock(() => {}),
	};
	const restoreLogger = stubModule(loggerPath, { logger });

	delete requireModule.cache[requireModule.resolve(modulePath)];
	const module = await import(modulePath);

	const restoreAll = () => {
		restorePrisma();
		restoreAuth();
		restoreLogger();
		delete requireModule.cache[requireModule.resolve(modulePath)];
	};

	return { module, findUser, createLog, auth, logger, restoreAll };
};

test("respons.success logs and responds with payload", async () => {
	const { module, findUser, createLog, logger, restoreAll } = await setup();
	const { req, res } = createReqRes();

	try {
		await module.respons.success("Success message", { hello: "world" }, module.HttpStatus.OK, res, req);

		expect(res.statusCode).toBe(200);
		expect(res.payload).toEqual({
			success: true,
			message: "Success message",
			data: { hello: "world" },
		});

		expect(findUser.mock.calls.length).toBe(1);
		expect(createLog.mock.calls.length).toBe(1);
		expect(logger.info.mock.calls.length).toBe(1);
		expect(logger.warn.mock.calls.length).toBe(0);
		expect(logger.error.mock.calls.length).toBe(0);
	} finally {
		restoreAll();
	}
});

test("respons.success with pagination", async () => {
	const { module, restoreAll } = await setup();
	const { req, res } = createReqRes();
	const pagination = { currentPage: 1, totalPages: 1, totalData: 1, limit: 10 };

	try {
		await module.respons.success("Success with pagination", [{ id: 1 }], module.HttpStatus.OK, res, req, pagination);

		expect(res.statusCode).toBe(200);
		expect(res.payload).toEqual({
			success: true,
			message: "Success with pagination",
			data: [{ id: 1 }],
			pagination,
		});
	} finally {
		restoreAll();
	}
});

test("respons.error logs warning when database write fails", async () => {
	const failingLog = mock(async () => {
		throw new Error("db failure");
	});

	const { module, logger, restoreAll } = await setup({ createLog: failingLog });
	const { req, res } = createReqRes();

	try {
		await module.respons.error("Error message", { reason: "failure" }, module.HttpStatus.BAD_REQUEST, res, req);

		expect(res.statusCode).toBe(400);
		expect(res.payload).toEqual({
			success: false,
			message: "Error message",
			error: { reason: "failure" },
		});

		expect(logger.error.mock.calls.length).toBe(1);
		expect(logger.warn.mock.calls.length).toBe(1);
	} finally {
		restoreAll();
	}
});
