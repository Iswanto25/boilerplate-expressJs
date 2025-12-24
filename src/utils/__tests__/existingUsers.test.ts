import assert from "node:assert/strict";
import test, { mock } from "node:test";

import prisma from "../../configs/database";
import { existingEmail } from "../existingUsers";

test("existingEmail returns user when prisma finds a match", async () => {
	const sampleUser = { id: "user-1", email: "test@example.com" };
	const spy = mock.method(prisma.user, "findUnique", async () => sampleUser);

	try {
		const result = await existingEmail("test@example.com");
		assert.deepEqual(result, sampleUser);
	} finally {
		spy.mock.restore();
	}
});

test("existingEmail returns null when no user found", async () => {
	const spy = mock.method(prisma.user, "findUnique", async () => null);

	try {
		const result = await existingEmail("missing@example.com");
		assert.equal(result, null);
	} finally {
		spy.mock.restore();
	}
});
