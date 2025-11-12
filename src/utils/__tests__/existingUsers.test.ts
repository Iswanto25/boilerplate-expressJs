import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { createRequire } from "node:module";
import path from "node:path";

const requireModule = createRequire(__filename);
const modulePath = "../existingUsers";
const prismaPath = path.join(__dirname, "../../configs/database");

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
                        findUnique: mock.fn(async () => null),
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
        const findUnique = mock.fn(async () => sampleUser);
        const { module, prisma, restore } = await setup({ findUnique });

        try {
                const result = await module.existingEmail("test@example.com");

                assert.deepEqual(result, sampleUser);
                assert.equal(findUnique.mock.calls.length, 1);
                assert.deepEqual(prisma.user.findUnique.mock.calls[0].arguments[0], {
                        where: { email: "test@example.com" },
                });
        } finally {
                restore();
        }
});

test("existingEmail returns null when no user found", async () => {
        const findUnique = mock.fn(async () => null);
        const { module, prisma, restore } = await setup({ findUnique });

        try {
                const result = await module.existingEmail("missing@example.com");

                assert.equal(result, null);
                assert.equal(findUnique.mock.calls.length, 1);
                assert.deepEqual(prisma.user.findUnique.mock.calls[0].arguments[0], {
                        where: { email: "missing@example.com" },
                });
        } finally {
                restore();
        }
});
