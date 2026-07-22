import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const requireModule = createRequire(fileURLToPath(import.meta.url));
const modulePath = "@/utils/logger";

const reloadLogger = async () => {
	delete requireModule.cache[requireModule.resolve(modulePath)];
	return import(modulePath);
};

test("logger uses debug level by default", async () => {
	delete process.env.NODE_ENV;

	const { logger } = await reloadLogger();
	assert.equal(logger.level, "debug");
});

test("logger switches to info level in production", async () => {
	process.env.NODE_ENV = "production";

	const { logger } = await reloadLogger();
	assert.equal(logger.level, "info");

	delete process.env.NODE_ENV;
});
