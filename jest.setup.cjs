// Jest setup file
// Load environment variables untuk testing
require("dotenv").config({ path: ".env.test" });

// Global test timeout
jest.setTimeout(10000);

// Mock console untuk mengurangi noise di test output
if (process.env.SUPPRESS_LOGS === "true") {
	global.console = {
		...console,
		log: jest.fn(),
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
	};
}
