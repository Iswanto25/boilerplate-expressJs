import assert from "node:assert/strict";
import test from "node:test";

test("pagination utility module loads without exports", async () => {
	const module = await import("../pagination");
	assert.equal(Object.keys(module).length, 0);
});
