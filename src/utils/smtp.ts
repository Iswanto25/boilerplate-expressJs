import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config({ quiet: process.env.NODE_ENV === "production" });


interface SendEmailOptions {
	to: string;
	subject: string;
	html?: string;
	text?: string;
	fromName?: string;
	fromEmail?: string;
}

// Check if SMTP is configured
const isSMTPConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (!isSMTPConfigured) {
	console.warn("⚠️  SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS) - email sending will be skipped");
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
	if (!isSMTPConfigured) {
		console.warn(`⚠️  Email sending skipped (SMTP not configured) - would have sent to: ${options.to} with subject: "${options.subject}"`);
		return;
	}

	try {
		const transporter = nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: Number(process.env.SMTP_PORT) || 587,
			secure: process.env.SMTP_SECURE === "true",
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		});
		const fromAddress = options.fromEmail || process.env.SMTP_FROM || process.env.SMTP_USER;
		const fromName = options.fromName || process.env.APP_NAME || "Boilerplate App";
		await transporter.sendMail({
			from: `"${fromName}" <${fromAddress}>`,
			to: options.to,
			subject: options.subject,
			text: options.text,
			html: options.html,
		});
		console.info(`📨 Email terkirim ke ${options.to} dengan subjek "${options.subject}"`);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.warn(`⚠️  Gagal mengirim email ke ${options.to}: ${message}`);
		// Don't throw error, just log warning
	}
};
