import { test, describe, expect, mock } from "bun:test";
import { createRequire } from "node:module";

const requireModule = createRequire(__filename);
const modulePath = "@/utils/existingUsers";
const prismaPath = "@/configs/database";

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

const setup = async (overrides?: { findUnique?: any }) => {
	const prisma: any = {
		user: {
			findUnique: mock(async () => null),
		},
	};

	if (overrides?.findUnique) {
		prisma.user.findUnique = overrides.findUnique;
	}

	const restorePrisma = stubModule(prismaPath, { __esModule: true, default: prisma });
	delete requireModule.cache[requireModule.resolve(modulePath)];

	const module = await import(modulePath);

	return {
		module,
		prisma,
		restore: () => {
			restorePrisma();
			delete requireModule.cache[requireModule.resolve(modulePath)];
		},
	};
};

test("existingEmail returns user when prisma finds a match", async () => {
	const sampleUser = { id: "user-1", email: "test@example.com" };
	const findUnique = mock(async () => sampleUser);
	const { module, prisma, restore } = await setup({ findUnique });

	try {
		const result = await module.existingEmail("test@example.com");

		expect(result).toEqual(sampleUser);
		expect(findUnique.mock.calls.length).toBe(1);
		expect(prisma.user.findUnique.mock.calls[0][0]).toEqual({
			where: { email: "test@example.com" },
		});
	} finally {
		restore();
	}
});

test("existingEmail returns null when no user found", async () => {
	const findUnique = mock(async () => null);
	const { module, prisma, restore } = await setup({ findUnique });

	try {
		const result = await module.existingEmail("missing@example.com");

		expect(result).toBe(null);
		expect(findUnique.mock.calls.length).toBe(1);
		expect(prisma.user.findUnique.mock.calls[0][0]).toEqual({
			where: { email: "missing@example.com" },
		});
	} finally {
		restore();
	}
});
