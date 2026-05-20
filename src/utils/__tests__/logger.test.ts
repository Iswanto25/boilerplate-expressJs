import { test, describe, expect } from "bun:test";
import { getLogLevel } from "@/utils/logger.js";

test("getLogLevel returns debug for non-production", () => {
	expect(getLogLevel("development")).toBe("debug");
	expect(getLogLevel(undefined)).toBe("debug");
});

test("getLogLevel returns info for production", () => {
	expect(getLogLevel("production")).toBe("info");
});
