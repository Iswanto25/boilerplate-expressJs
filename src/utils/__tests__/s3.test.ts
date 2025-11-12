import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { mock } from "node:test";
import { createRequire } from "node:module";
import type { Express } from "express";

const requireModule = createRequire(__filename);
const modulePath = "../s3";

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

type SetupResult = {
	module: typeof import("../s3");
	handlers: Map<string, (command: { input: any }) => any>;
	sendMock: ReturnType<typeof mock.fn>;
	getSignedUrl: ReturnType<typeof mock.fn>;
	restoreAll: () => void;
};

const setup = async (): Promise<SetupResult> => {
	process.env.MINIO_ENDPOINT = "http://localhost:9000";
	process.env.MINIO_BUCKET_NAME = "test-bucket";
	process.env.MINIO_ACCESS_KEY = "access";
	process.env.MINIO_SECRET_KEY = "secret";
	process.env.MINIO_REGION = "us-east-1";
	delete process.env.MINIO_USE_SSL;

	const handlers = new Map<string, (command: { input: any }) => any>();

	const sendMock = mock.fn(async (command: any) => {
		const handler = handlers.get(command.constructor.name);
		if (!handler) {
			throw new Error(`Unhandled command: ${command.constructor.name}`);
		}
		return handler(command);
	});

	class BaseCommand {
		input: any;
		constructor(input: any) {
			this.input = input;
		}
	}

	class PutObjectCommand extends BaseCommand {}
	class GetObjectCommand extends BaseCommand {}
	class DeleteObjectCommand extends BaseCommand {}
	class HeadObjectCommand extends BaseCommand {}
	class DeleteObjectsCommand extends BaseCommand {}
	class ListObjectsV2Command extends BaseCommand {}

	class S3Client {
		config: any;
		constructor(config: any) {
			this.config = config;
		}
		async send(command: any) {
			return sendMock(command);
		}
	}

	const getSignedUrl = mock.fn(async () => "signed-url");

	const restoreClient = stubModule("@aws-sdk/client-s3", {
		S3Client,
		PutObjectCommand,
		GetObjectCommand,
		DeleteObjectCommand,
		HeadObjectCommand,
		DeleteObjectsCommand,
		ListObjectsV2Command,
		_Object: class {},
	});

	const restoreHandler = stubModule("@aws-sdk/node-http-handler", {
		NodeHttpHandler: class {},
	});

	const restorePresigner = stubModule("@aws-sdk/s3-request-presigner", {
		getSignedUrl,
	});

	delete requireModule.cache[requireModule.resolve(modulePath)];
	const module = await import(modulePath);

	return {
		module,
		handlers,
		sendMock,
		getSignedUrl,
		restoreAll: () => {
			restoreClient();
			restoreHandler();
			restorePresigner();
		},
	};
};

const createTempFile = (contents: string = "hello world") => {
	const filePath = path.join(os.tmpdir(), `upload-${Date.now()}.txt`);
	fs.writeFileSync(filePath, contents);
	return filePath;
};

test("headFile returns metadata when object exists", async () => {
	const { module, handlers, restoreAll } = await setup();
	const lastModified = new Date();
	handlers.set("HeadObjectCommand", async () => ({
		ETag: "etag",
		ContentLength: 123,
		ContentType: "image/png",
		LastModified: lastModified,
	}));

	try {
		const result = await module.headFile("avatars", "user.png");
		assert.deepEqual(result, {
			exists: true,
			etag: "etag",
			contentLength: 123,
			contentType: "image/png",
			lastModified,
		});
	} finally {
		restoreAll();
	}
});

test("headFile returns exists=false on 404", async () => {
	const { module, handlers, restoreAll } = await setup();
	handlers.set("HeadObjectCommand", async () => {
		const error: any = new Error("not found");
		error.$metadata = { httpStatusCode: 404 };
		throw error;
	});

	try {
		const result = await module.headFile("avatars", "missing.png");
		assert.deepEqual(result, { exists: false });
	} finally {
		restoreAll();
	}
});

test("uploadFile uploads stream and removes temp file", async () => {
	const { module, handlers, sendMock, restoreAll } = await setup();

	let capturedKey = "";
	handlers.set("PutObjectCommand", async (command) => {
		capturedKey = command.input.Key;
		// Consume the stream to prevent async cleanup issues
		const stream = command.input.Body;
		if (stream && typeof stream.read === "function") {
			await new Promise((resolve, reject) => {
				stream.on("end", resolve);
				stream.on("error", reject);
				stream.on("data", () => {}); // consume the data
			});
		}
		return {};
	});

	const tempFile = createTempFile();
	const file = {
		originalname: "avatar.jpg",
		mimetype: "image/jpeg",
		path: tempFile,
	} as Express.Multer.File;

	try {
		const url = await module.uploadFile(file, "avatars");
		assert.equal(sendMock.mock.calls.length, 1);
		assert.ok(capturedKey.startsWith("avatars/"));
		assert.ok(url.startsWith("http://localhost:9000/test-bucket/avatars/"));
		assert.equal(fs.existsSync(tempFile), false);
	} finally {
		restoreAll();
		if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
	}
});

test("uploadBase64 stores buffer and validates size", async () => {
	const { module, handlers, restoreAll } = await setup();
	let savedContentType = "";
	let savedBodyLength = 0;

	handlers.set("PutObjectCommand", async (command) => {
		savedContentType = command.input.ContentType;
		savedBodyLength = command.input.Body.length;
		return {};
	});

	const base64 = "data:image/png;base64," + Buffer.from("filedata").toString("base64");

	try {
		const url = await module.uploadBase64(base64, "images", 2, ["image/png"]);
		assert.ok(url.includes("/images/"));
		assert.equal(savedContentType, "image/png");
		assert.equal(savedBodyLength, Buffer.from("filedata").length);
	} finally {
		restoreAll();
	}
});

test("uploadBase64 rejects disallowed formats", async () => {
	const { module, restoreAll } = await setup();
	const base64 = "data:image/png;base64," + Buffer.from("filedata").toString("base64");

	try {
		await assert.rejects(
			() => module.uploadBase64(base64, "images", 2, ["image/jpeg"]),
			(err: any) => {
				return err.code === "UNSUPPORTED_MEDIA_TYPE";
			},
		);
	} finally {
		restoreAll();
	}
});

test("getFile returns presigned url when object exists", async () => {
	const { module, handlers, getSignedUrl, restoreAll } = await setup();
	handlers.set("HeadObjectCommand", async () => ({ ETag: "etag" }));

	try {
		const url = await module.getFile("avatars", "user.png");
		assert.equal(url, "signed-url");
		assert.equal(getSignedUrl.mock.calls.length, 1);
	} finally {
		restoreAll();
	}
});

test("deleteFile respects strict and verifyAfter options", async () => {
	const { module, handlers, restoreAll } = await setup();
	let headCalls = 0;
	handlers.set("HeadObjectCommand", async () => {
		headCalls += 1;
		// First call (strict check): file exists
		// Second call (verifyAfter check): file no longer exists (404)
		if (headCalls === 1) {
			return { ETag: "etag" };
		} else {
			const error: any = new Error("NotFound");
			error.name = "NotFound";
			error.$metadata = { httpStatusCode: 404 };
			throw error;
		}
	});
	const deleteSpy = mock.fn(async () => ({}));
	handlers.set("DeleteObjectCommand", deleteSpy);

	try {
		const result = await module.deleteFile("avatars", "user.png", { strict: true, verifyAfter: true });
		assert.deepEqual(result, { deleted: true, key: "avatars/user.png" });
		assert.equal(headCalls, 2);
		assert.equal(deleteSpy.mock.calls.length, 1);
	} finally {
		restoreAll();
	}
});

test("deleteMany aggregates successes and errors", async () => {
	const { module, handlers, restoreAll } = await setup();

	handlers.set("DeleteObjectsCommand", async (command) => ({
		Deleted: command.input.Delete.Objects.slice(0, 1),
		Errors: command.input.Delete.Objects.slice(1).map((obj: any) => ({
			Key: obj.Key,
			Code: "AccessDenied",
			Message: "nope",
		})),
	}));

	try {
		const result = await module.deleteMany([
			{ folder: "avatars", file: "one.png" },
			{ folder: "avatars", file: "two.png" },
		]);

		assert.deepEqual(result.deleted, ["avatars/one.png"]);
		assert.equal(result.errors.length, 1);
	} finally {
		restoreAll();
	}
});

test("deleteByPrefix deletes listed objects", async () => {
	const { module, handlers, restoreAll } = await setup();
	let listCalls = 0;

	handlers.set("ListObjectsV2Command", async () => {
		listCalls += 1;
		if (listCalls === 1) {
			return {
				Contents: [{ Key: "prefix/a" }, { Key: "prefix/b" }],
				IsTruncated: false,
			};
		}
		return { Contents: [], IsTruncated: false };
	});

	handlers.set("DeleteObjectsCommand", async (command) => ({
		Deleted: command.input.Delete.Objects,
		Errors: [],
	}));

	try {
		const result = await module.deleteByPrefix("prefix");
		assert.deepEqual(result, { deleted: 2, errors: 0 });
	} finally {
		restoreAll();
	}
});
