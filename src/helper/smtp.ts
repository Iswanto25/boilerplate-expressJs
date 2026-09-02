import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { logger } from "@/utils/logger.js";
dotenv.config({ quiet: true });

interface SendEmailOptions {
	to: string;
	subject: string;
	html?: string;
	text?: string;
	fromName?: string;
	fromEmail?: string;
}

export const isSMTPConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (!isSMTPConfigured) {
	logger.warn("SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS) - email sending will be skipped");
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
	if (!transporter) {
		transporter = nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: Number(process.env.SMTP_PORT) || 587,
			secure: process.env.SMTP_SECURE === "true",
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		});
	}
	return transporter;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
	if (!isSMTPConfigured) {
		logger.warn({ to: options.to, subject: options.subject }, "Email sending skipped (SMTP not configured)");
		return;
	}

	try {
		const fromAddress = options.fromEmail || process.env.SMTP_FROM;
		const fromName = options.fromName || process.env.APP_NAME;
		await getTransporter().sendMail({
			from: `${fromName} <${fromAddress}>`,
			to: options.to,
			subject: options.subject,
			text: options.text,
			html: options.html,
		});
		logger.info({ to: options.to, subject: options.subject }, "Email sent successfully");
	} catch (error) {
		logger.error({ err: error, to: options.to, subject: options.subject }, "Failed to send email");
		throw error;
	}
};
