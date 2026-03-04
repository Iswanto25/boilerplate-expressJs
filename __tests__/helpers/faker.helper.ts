import { faker } from "@faker-js/faker";

/**
 * Faker Helper untuk membuat dummy data testing
 * Menggunakan @faker-js/faker untuk generate data yang realistis
 */

// Set seed untuk konsistensi dalam testing
export const setFakerSeed = (seed: number = 12345) => {
	faker.seed(seed);
};

// Reset seed untuk random data
export const resetFakerSeed = () => {
	faker.seed();
};

/**
 * Generate dummy user data
 */
export const generateFakeUser = (overrides?: Partial<any>) => {
	return {
		id: faker.string.uuid(),
		name: faker.person.fullName(),
		email: faker.internet.email().toLowerCase(),
		password: faker.internet.password({ length: 12 }),
		phone: faker.string.numeric(10),
		address: faker.location.streetAddress({ useFullAddress: true }),
		photo: faker.image.avatar(),
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent(),
		...overrides,
	};
};

/**
 * Generate multiple fake users
 */
export const generateFakeUsers = (count: number = 5, overrides?: Partial<any>) => {
	return Array.from({ length: count }, () => generateFakeUser(overrides));
};

/**
 * Generate fake registration data
 */
export const generateFakeRegisterData = (overrides?: Partial<any>) => {
	return {
		name: faker.person.fullName(),
		email: faker.internet.email().toLowerCase(),
		password: faker.internet.password({ length: 12 }),
		phone: faker.string.numeric(10),
		address: faker.location.streetAddress({ useFullAddress: true }),
		photo: faker.image.avatar(),
		...overrides,
	};
};

/**
 * Generate fake login credentials
 */
export const generateFakeLoginData = (overrides?: Partial<any>) => {
	return {
		email: faker.internet.email().toLowerCase(),
		password: faker.internet.password({ length: 12 }),
		...overrides,
	};
};

/**
 * Generate fake JWT tokens
 */
export const generateFakeTokens = (overrides?: Partial<any>) => {
	return {
		accessToken: faker.string.alphanumeric(128),
		refreshToken: faker.string.alphanumeric(128),
		...overrides,
	};
};

/**
 * Generate fake base64 image
 */
export const generateFakeBase64Image = () => {
	// Data URL untuk gambar PNG 1x1 pixel transparan
	return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
};

/**
 * Generate fake OTP
 */
export const generateFakeOTP = () => {
	return faker.string.numeric(6);
};

/**
 * Generate fake email
 */
export const generateFakeEmail = () => {
	return faker.internet.email().toLowerCase();
};

/**
 * Generate fake phone number
 */
export const generateFakePhoneNumber = () => {
	return faker.string.numeric(10);
};

/**
 * Generate fake password
 */
export const generateFakePassword = (length: number = 12) => {
	return faker.internet.password({ length });
};

/**
 * Generate fake UUID
 */
export const generateFakeUUID = () => {
	return faker.string.uuid();
};

/**
 * Generate fake date
 */
export const generateFakeDate = () => {
	return faker.date.recent();
};

/**
 * Generate fake NIK (Nomor Induk Kependudukan - 16 digit)
 */
export const generateFakeNIK = () => {
	return faker.string.numeric(16);
};

/**
 * Generate fake error response
 */
export const generateFakeErrorResponse = (overrides?: Partial<any>) => {
	return {
		status: "error",
		message: faker.lorem.sentence(),
		data: null,
		...overrides,
	};
};

/**
 * Generate fake success response
 */
export const generateFakeSuccessResponse = (data?: any, overrides?: Partial<any>) => {
	return {
		status: "success",
		message: faker.lorem.sentence(),
		data: data || null,
		...overrides,
	};
};

/**
 * Generate bulk registration data
 */
export const generateBulkRegisterData = (count: number = 10) => {
	return Array.from({ length: count }, () => generateFakeRegisterData());
};

/**
 * Generate fake profile update data
 */
export const generateFakeProfileUpdateData = (overrides?: Partial<any>) => {
	return {
		name: faker.person.fullName(),
		phone: faker.string.numeric(10),
		address: faker.location.streetAddress({ useFullAddress: true }),
		photo: faker.image.avatar(),
		...overrides,
	};
};
