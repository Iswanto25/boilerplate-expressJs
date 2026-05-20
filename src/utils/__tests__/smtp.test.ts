import { test, describe, expect, mock } from "bun:test";
import { createRequire } from "node:module";

const requireModule = createRequire(__filename);
const modulePath = "@/utils/smtp";
const nodemailerPath = "nodemailer";

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

const setup = async (sendBehavior?: () => Promise<void>) => {
	const sendMail = mock(sendBehavior || (async () => {}));
	const createTransport = mock(() => ({ sendMail }));

	const restore = stubModule(nodemailerPath, { createTransport });
	delete requireModule.cache[requireModule.resolve(modulePath)];

	process.env.SMTP_HOST = "smtp.example.com";
	process.env.SMTP_PORT = "587";
	process.env.SMTP_SECURE = "false";
	process.env.SMTP_USER = "user@example.com";
	process.env.SMTP_PASS = "password";
	process.env.SMTP_FROM = "no-reply@example.com";
	process.env.APP_NAME = "Boilerplate App";

	const module = await import(modulePath);

	return { module, createTransport, sendMail, restore };
};

test("sendEmail constructs transporter and sends mail", async () => {
	const { module, createTransport, sendMail, restore } = await setup();

	const payload = {
		to: "recipient@example.com",
		subject: "Hello",
		html: "<p>Hi</p>",
	};

	try {
		await module.sendEmail(payload);

		expect(createTransport.mock.calls.length).toBe(1);
		expect(sendMail.mock.calls.length).toBe(1);
		const calls = sendMail.mock.calls as any[];
		if (calls.length === 0) throw new Error("sendMail was not called");
		const args = calls[0].arguments[0] as any;
		expect(args.to).toBe(payload.to);
		expect(args.subject).toBe(payload.subject);
		expect(args.from).toBe(`"Boilerplate App" <no-reply@example.com>`);
	} finally {
		restore();
	}
});

test("sendEmail surfaces transport errors", async () => {
	const { module, restore } = await setup(async () => {
		throw new Error("SMTP failure");
	});

	try {
		await expect(module.sendEmail({ to: "x@y.com", subject: "Hi" })).rejects.toThrow(/Failed to send email/);
	} finally {
		restore();
	}
});
