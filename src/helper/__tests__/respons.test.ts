import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { createRequire } from "node:module";

const requireModule = createRequire(import.meta.url);
const modulePath = "@/utils/respons";
const loggerPath = "@/utils/logger";

const createReqRes = (withUser = true) => {
	const user =
		withUser ?
			{
				id: "user-1",
				email: "test@test.com",
				roleId: "role-1",
				roleName: "admin",
				profile: { name: "Tester", phone: null, address: null, photo: null, NIK: null },
			}
		:	undefined;

	const req: any = {
		user,
		headers: {
			"x-forwarded-for": "203.0.113.1",
			"user-agent": "UnitTestAgent/1.0",
		},
		socket: { remoteAddress: "10.0.0.1" },
		startTime: Date.now(),
		get: () => "localhost",
		protocol: "http",
		originalUrl: "/api/test",
		method: "POST",
		path: "/api/test",
		reqId: "test-req-1",
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

const setup = async (overrides?: { createLog?: ReturnType<typeof mock.fn> }) => {
	const createLog = overrides?.createLog ?? mock.fn(async () => ({}));

	const logger: any = {
		info: mock.fn(() => {}),
		warn: mock.fn(() => {}),
		error: mock.fn(() => {}),
	};
	const restoreLogger = (() => {
		const resolved = requireModule.resolve(loggerPath);
		const original = requireModule.cache[resolved];
		(requireModule.cache as any)[resolved] = {
			id: resolved,
			filename: resolved,
			loaded: true,
			exports: { logger, formatIsoWithTz: (d: Date) => d.toISOString() },
		};
		return () => {
			if (original) {
				(requireModule.cache as any)[resolved] = original;
			} else {
				delete requireModule.cache[resolved];
			}
		};
	})();

	delete requireModule.cache[requireModule.resolve(modulePath)];
	const module = await import(modulePath);

	// Stub auditLogger.saveAuditLog to use our createLog mock
	const auditLoggerPath = requireModule.resolve("@/utils/auditLogger");
	const originalAudit = requireModule.cache[auditLoggerPath];
	(requireModule.cache as any)[auditLoggerPath] = {
		id: auditLoggerPath,
		filename: auditLoggerPath,
		loaded: true,
		exports: { saveAuditLog: createLog },
	};
	const restoreAudit = () => {
		if (originalAudit) {
			(requireModule.cache as any)[auditLoggerPath] = originalAudit;
		} else {
			delete requireModule.cache[auditLoggerPath];
		}
	};

	const restoreAll = () => {
		restoreLogger();
		restoreAudit();
		delete requireModule.cache[requireModule.resolve(modulePath)];
	};

	return { module, createLog, logger, restoreAll };
};

test("respons.success logs and responds with payload", async () => {
	const { module, createLog, logger, restoreAll } = await setup();
	const { req, res } = createReqRes(true);

	try {
		module.respons.success("Success message", { hello: "world" }, 200, res, req);

		assert.equal(res.statusCode, 200);
		assert.deepEqual(res.payload, {
			success: true,
			message: "Success message",
			data: { hello: "world" },
		});

		assert.equal(createLog.mock.calls.length, 1);
		assert.equal(logger.info.mock.calls.length, 1);
		assert.equal(logger.warn.mock.calls.length, 0);
		assert.equal(logger.error.mock.calls.length, 0);
	} finally {
		restoreAll();
	}
});

test("respons.success with pagination", async () => {
	const { module, restoreAll } = await setup();
	const { req, res } = createReqRes(true);
	const pagination = { currentPage: 1, totalPages: 1, totalData: 1, limit: 10 };

	try {
		module.respons.success("Success with pagination", [{ id: 1 }], 200, res, req, pagination);

		assert.equal(res.statusCode, 200);
		assert.deepEqual(res.payload, {
			success: true,
			message: "Success with pagination",
			data: [{ id: 1 }],
			pagination,
		});
	} finally {
		restoreAll();
	}
});

test("respons.error logs when database write fails", async () => {
	const failingLog = mock.fn(async () => {
		throw new Error("db failure");
	});

	const { module, logger, restoreAll } = await setup({ createLog: failingLog });
	const { req, res } = createReqRes(true);

	try {
		module.respons.error("Error message", { reason: "failure" }, 400, res, req);

		assert.equal(res.statusCode, 400);
		assert.deepEqual(res.payload, {
			success: false,
			message: "Error message",
			error: { reason: "failure" },
		});

		assert.equal(logger.error.mock.calls.length, 1);
	} finally {
		restoreAll();
	}
});

test("respons.success without user returns Guest", async () => {
	const { module, restoreAll } = await setup();
	const { req, res } = createReqRes(false);

	try {
		module.respons.success("Guest success", { ok: true }, 200, res, req);

		assert.equal(res.statusCode, 200);
		assert.equal(res.payload.success, true);
	} finally {
		restoreAll();
	}
});
