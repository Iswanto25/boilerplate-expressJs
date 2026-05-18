declare namespace Bun {
	const version: string;
	const env: Record<string, string | undefined>;
	namespace password {
		function hash(
			password: string | Buffer,
			options?: {
				algorithm?: "bcrypt" | "argon2id" | "argon2d" | "argon2i";
				cost?: number;
				memoryCost?: number;
				timeCost?: number;
			},
		): Promise<string>;
		function verify(password: string | Buffer, hash: string): Promise<boolean>;
	}
}
