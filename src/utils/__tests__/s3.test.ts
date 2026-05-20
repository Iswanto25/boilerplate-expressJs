
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, describe, expect, mock } from "bun:test";
import { createRequire } from "node:module";
import type { Express } from "express";

const requireModule = createRequire(__filename);
const modulePath = "@/utils/s3";

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
	module: typeof import("@/utils/s3.js");
	handlers: Map<string, (command: { input: any }) => any>;
	sendMock: ReturnType<typeof mock>;
	getSignedUrl: ReturnType<typeof mock>;
	restoreAll: () => void;
};

const setup = async (): Promise<SetupResult> => {
	process.env.S3_ENDPOINT = "http://localhost:9000";
	process.env.S3_BUCKET_NAME = "test-bucket";
	process.env.S3_ACCESS_KEY = "access";
	process.env.S3_SECRET_KEY = "secret";
	process.env.S3_REGION = "us-east-1";
	delete process.env.S3_USE_SSL;

	const handlers = new Map<string, (command: { input: any }) => any>();

	const sendMock = mock(async (command: any) => {
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

	const getSignedUrl = mock(async () => "signed-url");

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

	const restorePresigner = stubModule("@aws-sdk/s3-request-presigner", {
		getSignedUrl,
	});

	delete requireModule.cache[requireModule.resolve(modulePath)];
	const module = requireModule(modulePath);

	return {
		module,
		handlers,
		sendMock,
		getSignedUrl,
		restoreAll: () => {
			restoreClient();
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
		expect(result, {
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
		expect(result).toEqual({ exists: false });
	} finally {
		restoreAll();
	}
});

test("uploadFile uploads stream and removes temp file", async () => {
	const { module, handlers, sendMock, restoreAll } = await setup();

	let capturedKey = "";
	handlers.set("PutObjectCommand", async (command) => {
		capturedKey = command.input.Key;
		const stream = command.input.Body;
		if (stream && typeof stream.read === "function") {
			await new Promise((resolve, reject) => {
				stream.on("end", resolve);
				stream.on("error", reject);
				stream.on("data", () => {});
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
		const result = await module.uploadFile(file, "avatars");
		expect(sendMock.mock.calls.length).toBe(1);
		expect(capturedKey.startsWith("avatars/").toBeTruthy());
		expect(result.folder).toBe("avatars");
		expect(result.fileName.endsWith(".jpg").toBeTruthy());
		expect(fs.existsSync(tempFile)).toBe(false);
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
		const result = await module.uploadBase64("images", base64, 2, ["image/png"]);
		expect(result.url.includes("/images/").toBeTruthy());
		expect(savedContentType).toBe("image/png");
		expect(savedBodyLength).toBe(Buffer.from("filedata").length);
	} finally {
		restoreAll();
	}
});

test("uploadBase64 rejects disallowed formats", async () => {
	const { module, restoreAll } = await setup();
	const base64 = "data:image/png;base64," + Buffer.from("filedata").toString("base64");

	try {
		await assert.rejects(
			() => module.uploadBase64("images", base64, 2, ["image/jpeg"]),
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
		expect(url).toBe("signed-url");
		expect(getSignedUrl.mock.calls.length).toBe(1);
	} finally {
		restoreAll();
	}
});

test("deleteFile respects strict and verifyAfter options", async () => {
	const { module, handlers, restoreAll } = await setup();
	let headCalls = 0;
	handlers.set("HeadObjectCommand", async () => {
		headCalls += 1;
		if (headCalls === 1) {
			return { ETag: "etag" };
		} else {
			const error: any = new Error("NotFound");
			error.name = "NotFound";
			error.$metadata = { httpStatusCode: 404 };
			throw error;
		}
	});
	const deleteSpy = mock(async () => ({}));
	handlers.set("DeleteObjectCommand", deleteSpy);

	try {
		const result = await module.deleteFile("avatars", "user.png", { strict: true, verifyAfter: true });
		expect(result).toEqual({ deleted: true, key: "avatars/user.png" });
		expect(headCalls).toBe(2);
		expect(deleteSpy.mock.calls.length).toBe(1);
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

		expect(result.deleted).toEqual(["avatars/one.png"]);
		expect(result.errors.length).toBe(1);
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
		expect(result).toEqual({ deleted: 2, errors: 0 });
	} finally {
		restoreAll();
	}
});
