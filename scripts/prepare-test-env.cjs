const { spawnSync } = require("node:child_process");

if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = "test";
}

if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "generate"], {
	stdio: "inherit",
	env: process.env,
});

if (result.status !== 0) {
	process.exit(result.status ?? 1);
}
