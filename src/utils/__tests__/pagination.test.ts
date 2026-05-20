import { test, describe, expect, mock } from "bun:test";

test("pagination utility module exports paginate function", async () => {
	const module = await import("@/utils/pagination.js");
	expect(Object.keys(module).length).toBe(1);
	expect(typeof module.paginate === "function").toBeTruthy();
});
