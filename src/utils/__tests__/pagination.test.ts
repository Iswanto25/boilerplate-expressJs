import assert from "node:assert/strict";
import test from "node:test";

test("pagination utility module exports paginate function", async () => {
	const module = await import("../pagination");
	assert.equal(Object.keys(module).length, 1);
	assert.ok(typeof module.paginate === "function");
});
