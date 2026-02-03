import { fakerID_ID as faker } from "@faker-js/faker";
import fs from "fs";
import path from "path";

interface UserData {
	name: string;
	email: string;
	password: string;
	address: string;
	phone: string;
	photo: string;
}

/**
 * Generate unique user registration data
 * @param count - Number of users to generate
 * @returns Array of user registration data
 */
const generateUserData = (count: number): UserData[] => {
	const users: UserData[] = [];
	const usedEmails = new Set<string>();

	// Sample base64 image (1x1 pixel JPEG)
	const base64Photo =
		"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";

	let attempts = 0;
	const maxAttempts = count * 2; // Prevent infinite loop

	while (users.length < count && attempts < maxAttempts) {
		attempts++;

		// Generate unique email
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		const randomNum = faker.number.int({ min: 100, max: 9999 });
		const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@example.com`;

		// Skip if email already exists
		if (usedEmails.has(email)) {
			continue;
		}

		usedEmails.add(email);

		users.push({
			name: `${firstName} ${lastName}`,
			email: email,
			password: "SecurePassword123!",
			address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`,
			phone: "0812" + faker.string.numeric(8),
			photo: base64Photo,
		});
	}

	return users;
};

/**
 * Generate and save user data to JSON file
 */
const main = () => {
	const COUNT = 1000;

	console.log(`🔄 Generating ${COUNT} unique user data...`);

	const startTime = Date.now();
	const users = generateUserData(COUNT);
	const endTime = Date.now();

	const outputPath = path.join(process.cwd(), "test_data.json");
	fs.writeFileSync(outputPath, JSON.stringify(users, null, 2));

	console.log(`✅ Successfully generated ${users.length} users`);
	console.log(`📁 Saved to: ${outputPath}`);
	console.log(`⏱️  Time taken: ${endTime - startTime}ms`);
	console.log(`\n📝 Sample data (first 3 users):`);
	console.log(JSON.stringify(users.slice(0, 3), null, 2));
};

// Run if executed directly
if (require.main === module) {
	main();
}

export { generateUserData };
