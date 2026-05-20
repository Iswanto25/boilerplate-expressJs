import { test, describe, expect, mock } from "bun:test";
import { createRequire } from "node:module";

const requireModule = createRequire(__filename);
const modulePath = "@/utils/jwt";

const reloadJwtModule = async () => {
	delete requireModule.cache[requireModule.resolve(modulePath)];
	return import(modulePath);
};

const setSecrets = (access?: string, refresh?: string) => {
	if (access) {
		process.env.JWT_SECRET = access;
	} else {
		delete process.env.JWT_SECRET;
	}

	if (refresh) {
		process.env.JWT_REFRESH_SECRET = refresh;
	} else {
		delete process.env.JWT_REFRESH_SECRET;
	}
};

test("jwtUtils signs and verifies tokens with configured secrets", async () => {
	setSecrets("unit-test-secret", "unit-test-refresh");

	const { jwtUtils } = await reloadJwtModule();
	const payload = { id: "user-1", role: "admin" };

	const accessToken = jwtUtils.generateAccessToken(payload);
	const refreshToken = jwtUtils.generateRefreshToken(payload);

	expect(typeof accessToken === "string" && accessToken.length > 0).toBeTruthy();
	expect(typeof refreshToken === "string" && refreshToken.length > 0).toBeTruthy();

	const verifiedAccess = jwtUtils.verifyAccessToken(accessToken);
	const verifiedRefresh = jwtUtils.verifyRefreshToken(refreshToken);

	expect(verifiedAccess.id).toBe(payload.id);
	expect(verifiedRefresh.role).toBe(payload.role);
});

test("generateAccessToken throws when secret is missing", async () => {
	setSecrets(undefined, "unit-test-refresh");
	const { jwtUtils } = await reloadJwtModule();

	expect(() => jwtUtils.generateAccessToken({})).toThrow(/secretOrPrivateKey must have a value/);
});

test("verifyAccessToken rejects malformed tokens", async () => {
	setSecrets("unit-test-secret", "unit-test-refresh");
	const { jwtUtils } = await reloadJwtModule();

	expect(() => jwtUtils.verifyAccessToken("invalid")).toThrow(/jwt malformed/);
});
