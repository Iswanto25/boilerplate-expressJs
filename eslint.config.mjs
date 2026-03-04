import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		ignores: ["dist/", "node_modules/", "__tests__/", "test-report/", "coverage/", "**/*.test.ts", "**/*.spec.ts", "scripts/", "jest.config.js"],
	},
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"no-console": ["warn", { allow: ["warn", "error", "info"] }],
			"prefer-const": "error",
			"no-var": "error",
		},
	},
);
