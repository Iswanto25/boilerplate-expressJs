import assert from "node:assert/strict";
import test from "node:test";
import { generateApiKey, verifyApiKey } from "../signature.js";

const mockReqRes = (headers: Record<string, string> = {}) => {
	let statusCode = 200;
	let responseBody: any = null;
	let nextCalled = false;

	const req: any = {
		headers,
		method: "GET",
		originalUrl: "/test",
		path: "/test",
		reqId: "test-req-id",
		startTime: Date.now(),
		protocol: "http",
		get: (header: string) => (header === "host" ? "localhost" : headers[header.toLowerCase()] || ""),
		socket: { remoteAddress: "127.0.0.1" },
	};

	const res: any = {
		status(code: number) {
			statusCode = code;
			return this;
		},
		json(payload: any) {
			responseBody = payload;
			return this;
		},
	};

	const next = () => {
		nextCalled = true;
	};

	return {
		req,
		res,
		next,
		getStatusCode: () => statusCode,
		getBody: () => responseBody,
		isNextCalled: () => nextCalled,
	};
};

test("verifyApiKey - missing api key", async () => {
	const { req, res, next, getStatusCode, getBody, isNextCalled } = mockReqRes();

	verifyApiKey(req, res, next);

	assert.equal(isNextCalled(), false);
	assert.equal(getStatusCode(), 401);
	assert.equal(getBody()?.message, "API key tidak ditemukan");
});

test("verifyApiKey & generateApiKey - non-production (development) mode", async () => {
	const origEnv = process.env.NODE_ENV;
	const origUser = process.env.USER_KEY;
	const origSecret = process.env.SECRET_KEY;

	try {
		process.env.NODE_ENV = "development";
		process.env.USER_KEY = "devUser";
		process.env.SECRET_KEY = "devSecret";

		const apiKey = await generateApiKey("devUser", "devSecret");
		const { req, res, next, isNextCalled } = mockReqRes({ "x-api-key": apiKey });

		verifyApiKey(req, res, next);
		assert.equal(isNextCalled(), true);

		// Test invalid secret key
		const invalidApiKey = Buffer.from("devUser:wrongSecret").toString("base64");
		const invalidMock = mockReqRes({ "x-api-key": invalidApiKey });
		verifyApiKey(invalidMock.req, invalidMock.res, invalidMock.next);
		assert.equal(invalidMock.isNextCalled(), false);
		assert.equal(invalidMock.getStatusCode(), 401);
		assert.equal(invalidMock.getBody()?.message, "Identitas atau Secret Key tidak valid");
	} finally {
		process.env.NODE_ENV = origEnv;
		process.env.USER_KEY = origUser;
		process.env.SECRET_KEY = origSecret;
	}
});

test("verifyApiKey & generateApiKey - production mode valid signature", async () => {
	const origEnv = process.env.NODE_ENV;
	const origUser = process.env.USER_KEY;
	const origSecret = process.env.SECRET_KEY;

	try {
		process.env.NODE_ENV = "production";
		process.env.USER_KEY = "prodUser";
		process.env.SECRET_KEY = "prodSecret";

		const apiKey = await generateApiKey("prodUser", "prodSecret");
		const { req, res, next, isNextCalled } = mockReqRes({ "x-api-key": apiKey });

		verifyApiKey(req, res, next);
		assert.equal(isNextCalled(), true);
	} finally {
		process.env.NODE_ENV = origEnv;
		process.env.USER_KEY = origUser;
		process.env.SECRET_KEY = origSecret;
	}
});

test("verifyApiKey - production mode expired timestamp", async () => {
	const origEnv = process.env.NODE_ENV;
	const origUser = process.env.USER_KEY;
	const origSecret = process.env.SECRET_KEY;

	try {
		process.env.NODE_ENV = "production";
		process.env.USER_KEY = "prodUser";
		process.env.SECRET_KEY = "prodSecret";

		const UTC7_OFFSET_MS = 7 * 60 * 60 * 1000;
		// 10 minutes ago
		const expiredTime = Date.now() + UTC7_OFFSET_MS - 10 * 60 * 1000;
		const crypto = await import("node:crypto");
		const dataToSign = `prodUser:${expiredTime}`;
		const signature = crypto.createHmac("sha256", "prodSecret").update(dataToSign).digest("hex");
		const expiredApiKey = Buffer.from(`prodUser:${expiredTime}:${signature}`).toString("base64");

		const { req, res, next, getStatusCode, getBody, isNextCalled } = mockReqRes({ "x-api-key": expiredApiKey });
		verifyApiKey(req, res, next);

		assert.equal(isNextCalled(), false);
		assert.equal(getStatusCode(), 401);
		assert.equal(getBody()?.message, "Request expired");
	} finally {
		process.env.NODE_ENV = origEnv;
		process.env.USER_KEY = origUser;
		process.env.SECRET_KEY = origSecret;
	}
});

test("verifyApiKey - production mode invalid signature", async () => {
	const origEnv = process.env.NODE_ENV;
	const origUser = process.env.USER_KEY;
	const origSecret = process.env.SECRET_KEY;

	try {
		process.env.NODE_ENV = "production";
		process.env.USER_KEY = "prodUser";
		process.env.SECRET_KEY = "prodSecret";

		const UTC7_OFFSET_MS = 7 * 60 * 60 * 1000;
		const nowTime = Date.now() + UTC7_OFFSET_MS;
		const fakeSignature = "a".repeat(64);
		const invalidApiKey = Buffer.from(`prodUser:${nowTime}:${fakeSignature}`).toString("base64");

		const { req, res, next, getStatusCode, getBody, isNextCalled } = mockReqRes({ "x-api-key": invalidApiKey });
		verifyApiKey(req, res, next);

		assert.equal(isNextCalled(), false);
		assert.equal(getStatusCode(), 401);
		assert.equal(getBody()?.message, "Signature API Key tidak valid");
	} finally {
		process.env.NODE_ENV = origEnv;
		process.env.USER_KEY = origUser;
		process.env.SECRET_KEY = origSecret;
	}
});
