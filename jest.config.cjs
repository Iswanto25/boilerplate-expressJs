module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/src", "<rootDir>/__tests__"],

	// Support co-located tests (NestJS style)
	testMatch: [
		"**/__tests__/**/*.test.ts", // Di folder __tests__ (helpers & integration)
		"**/*.test.ts", // Co-located dengan source
		"**/*.spec.ts", // NestJS style
	],

	testPathIgnorePatterns: [
		"/node_modules/",
		"/dist/",
		"/__tests__/helpers/", // Helpers bukan test files
		"/src/utils/__tests__/", // Tests format native node --test (not jest)
	],

	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"^__tests__/(.*)$": "<rootDir>/__tests__/$1",
	},

	collectCoverageFrom: [
		"src/**/*.{ts,tsx}",
		"!src/**/*.d.ts",
		"!src/**/*.test.ts", // Exclude test files
		"!src/**/*.spec.ts", // Exclude spec files
		"!src/types/**",
	],

	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html", "json-summary"],
	setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
	testTimeout: 10000,
	verbose: true,
	clearMocks: true,
	resetMocks: true,
	restoreMocks: true,

	// Ignore transforming ESM modules
	transformIgnorePatterns: ["node_modules/(?!(@faker-js|uuid|p-limit|nanoid)/)"],

	// ESM support
	extensionsToTreatAsEsm: [".ts"],

	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: false,
				tsconfig: {
					esModuleInterop: true,
				},
			},
		],
	},

	// HTML Test Reporter Configuration
	reporters: [
		"default",
		[
			"jest-html-reporters",
			{
				publicPath: "./test-report",
				filename: "test-report.html",
				pageTitle: "Express.js Boilerplate - Test Report",
				expand: true,
				openReport: false,
				inlineSource: true,
				includeConsoleLog: true,
				includeFailureMsg: true,
				enableMergeData: true,
				dataMergeLevel: 1,
			},
		],
	],
};
