# Unit Testing dengan Jest dan Faker

## 📝 Overview

Project ini menggunakan **Jest** sebagai framework testing dan **@faker-js/faker** untuk generate dummy data yang realistis. Testing mencakup **unit tests**, **integration tests**, dan **coverage reporting**.

## 🛠 Tech Stack

- **Jest** - Framework testing JavaScript/TypeScript
- **ts-jest** - TypeScript preprocessor untuk Jest
- **@faker-js/faker** - Library untuk generate dummy data
- **supertest** - HTTP assertions untuk integration testing
- **@types/jest** - TypeScript definitions untuk Jest

## 📂 Struktur Testing

```
__tests__/
├── helpers/
│   ├── faker.helper.ts         # Helper untuk generate dummy data
│   └── mock.helper.ts          # Helper untuk create mock objects
├── services/
│   └── auth.service.test.ts    # Unit tests untuk auth services
├── controllers/
│   └── auth.controller.test.ts # Unit tests untuk auth controllers
└── integration/
    └── auth.api.test.ts        # Integration tests untuk API endpoints
```

## 🚀 Cara Menjalankan Test

### Menjalankan Semua Test

```bash
npm run test:jest
```

### Menjalankan Test dengan Watch Mode

```bash
npm run test:jest:watch
```

### Menjalankan Test dengan Coverage

```bash
npm run test:jest:coverage
```

### Menjalankan Unit Tests Saja

```bash
npm run test:unit
```

### Menjalankan Integration Tests Saja

```bash
npm run test:integration
```

### Menjalankan Semua Test (Node.js + Jest)

```bash
npm run test:all
```

## 📖 Panduan Penggunaan

### 1. Menggunakan Faker Helper

Faker helper menyediakan berbagai function untuk generate dummy data:

```typescript
import {
	generateFakeUser,
	generateFakeRegisterData,
	generateFakeLoginData,
	generateBulkRegisterData,
	setFakerSeed,
	resetFakerSeed,
} from "../helpers/faker.helper";

// Set seed untuk konsistensi hasil
setFakerSeed(12345);

// Generate single user
const user = generateFakeUser();
// Output: { id: '...', name: 'John Doe', email: 'john@example.com', ... }

// Generate multiple users
const users = generateFakeUsers(10);

// Generate registration data
const registerData = generateFakeRegisterData();

// Generate dengan custom override
const customUser = generateFakeUser({
	email: "custom@example.com",
	name: "Custom Name",
});

// Reset seed untuk random data
resetFakerSeed();
```

### 2. Menggunakan Mock Helper

Mock helper menyediakan mock objects untuk dependencies:

```typescript
import { createMockRequest, createMockResponse, createMockPrismaClient, createMockAuthenticatedUser } from "../helpers/mock.helper";

// Create mock Request
const req = createMockRequest({
	body: { email: "test@example.com" },
	user: { id: "user-123" },
});

// Create mock Response
const res = createMockResponse();

// Create authenticated user untuk testing
const authenticatedUser = createMockAuthenticatedUser({
	id: "custom-id",
	role: "admin",
});
```

### 3. Menulis Unit Test untuk Services

```typescript
import { authServices } from "../../src/features/auth/services/authServices";
import prisma from "../../src/configs/database";
import { generateFakeRegisterData } from "../helpers/faker.helper";

// Mock dependencies
jest.mock("../../src/configs/database");

describe("Auth Services", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should register a new user", async () => {
		// Arrange
		const registerData = generateFakeRegisterData();
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(prisma.user.create as jest.Mock).mockResolvedValue({
			id: "user-123",
			...registerData,
		});

		// Act
		const result = await authServices.register(registerData);

		// Assert
		expect(prisma.user.create).toHaveBeenCalled();
		expect(result.user.email).toBe(registerData.email);
	});
});
```

### 4. Menulis Unit Test untuk Controllers

```typescript
import { authController } from "../../src/features/auth/controllers/authControllers";
import { authServices } from "../../src/features/auth/services/authServices";
import { createMockRequest, createMockResponse } from "../helpers/mock.helper";
import { generateFakeRegisterData } from "../helpers/faker.helper";

jest.mock("../../src/features/auth/services/authServices");

describe("Auth Controllers", () => {
	it("should register user successfully", async () => {
		// Arrange
		const registerData = generateFakeRegisterData();
		const req = createMockRequest({ body: registerData });
		const res = createMockResponse();

		(authServices.register as jest.Mock).mockResolvedValue({
			user: { id: "user-123", email: registerData.email },
		});

		// Act
		await authController.register(req as any, res as any);

		// Assert
		expect(authServices.register).toHaveBeenCalledWith(expect.objectContaining({ email: registerData.email }));
		expect(res.status).toHaveBeenCalledWith(200);
	});
});
```

### 5. Menulis Integration Test

```typescript
import request from "supertest";
import { app } from "../../src/configs/express";
import { generateFakeRegisterData } from "../helpers/faker.helper";

describe("Auth API Integration Tests", () => {
	it("should register a new user", async () => {
		const registerData = generateFakeRegisterData();

		const response = await request(app).post("/api/auth/register").send(registerData);

		expect(response.status).toBe(200);
		expect(response.body.status).toBe("success");
		expect(response.body.data).toBeDefined();
	});
});
```

## 🎯 Best Practices

### 1. Test Isolation

- Setiap test harus independen dan tidak bergantung pada test lain
- Gunakan `beforeEach` untuk cleanup dan setup

```typescript
beforeEach(() => {
	jest.clearAllMocks();
});
```

### 2. Arrange-Act-Assert Pattern

Ikuti pola AAA untuk struktur test yang jelas:

```typescript
it("should do something", async () => {
	// Arrange - Setup test data dan mocks
	const data = generateFakeData();
	mockFunction.mockResolvedValue(expectedValue);

	// Act - Execute function yang di-test
	const result = await functionUnderTest(data);

	// Assert - Verify hasil
	expect(result).toBe(expectedValue);
});
```

### 3. Descriptive Test Names

Gunakan nama test yang deskriptif:

```typescript
// ✅ Good
it("should return 400 if email is missing", async () => {});

// ❌ Bad
it("test validation", async () => {});
```

### 4. Mock External Dependencies

Selalu mock dependencies eksternal:

```typescript
jest.mock("../../src/configs/database");
jest.mock("../../src/utils/s3");
jest.mock("../../src/utils/jwt");
```

### 5. Test Edge Cases

Jangan hanya test happy path, test juga edge cases:

```typescript
describe("register", () => {
	it("should register successfully", async () => {});
	it("should throw error if email already exists", async () => {});
	it("should throw error if email is invalid", async () => {});
	it("should handle password encryption correctly", async () => {});
});
```

## 📊 Coverage Reports

Setelah menjalankan `npm run test:jest:coverage`, coverage report akan tersedia di:

- Terminal output (summary)
- `coverage/lcov-report/index.html` (detailed HTML report)

Buka HTML report di browser untuk melihat detail coverage per file.

## 🔧 Configuration

### jest.config.js

File konfigurasi utama untuk Jest:

```javascript
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/src", "<rootDir>/__tests__"],
	testMatch: ["**/__tests__/**/*.test.ts", "**/*.spec.ts"],
	collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/**/__tests__/**"],
	// ... more config
};
```

### jest.setup.js

Setup file yang dijalankan sebelum test:

```javascript
require("dotenv").config({ path: ".env.test" });
jest.setTimeout(10000);
```

## 🆘 Troubleshooting

### Error: Cannot find module

Pastikan semua dependencies sudah terinstall:

```bash
npm install
```

### Test Timeout

Tingkatkan timeout di jest.setup.js atau per test:

```typescript
jest.setTimeout(30000);
// atau
it("long running test", async () => {}, 30000);
```

### Mock Not Working

Pastikan path mock sudah benar dan mock dipanggil sebelum import:

```typescript
jest.mock('./module'); // harus sebelum import
import { function } from './module';
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [Faker.js Documentation](https://fakerjs.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 💡 Tips

1. **Use faker seed untuk konsistensi**: `setFakerSeed(12345)` di `beforeAll()`
2. **Mock hanya apa yang diperlukan**: Jangan over-mock
3. **Test behavior, bukan implementation**: Focus pada output, bukan internal logic
4. **Keep tests simple**: Satu test untuk satu scenario
5. **Write tests first (TDD)**: Ini membantu design yang lebih baik

## ✅ Checklist Test Coverage

- [ ] Unit tests untuk semua services
- [ ] Unit tests untuk semua controllers
- [ ] Integration tests untuk semua API endpoints
- [ ] Test happy path dan edge cases
- [ ] Test error handling
- [ ] Test validation
- [ ] Test authentication/authorization
- [ ] Minimum 80% code coverage
