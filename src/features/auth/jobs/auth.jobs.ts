import { Queue, Worker, Job } from "bullmq";
import { bullConnection } from "@/configs/bull.js";
import { logger } from "@/utils/logger.js";
import { uploadBase64, deleteFile } from "@/utils/s3.js";
import { authRepository } from "@/features/auth/repositories/auth.repository.js";
import { sendEmail } from "@/utils/smtp.js";
import { generateResetPasswordEmail, generateGenericOTPEmail } from "@/utils/mail.js";

export const AUTH_QUEUE_NAME = "auth-queue";

export const authQueue = new Queue(AUTH_QUEUE_NAME, {
	connection: bullConnection,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 1000,
		},
		removeOnComplete: true,
		removeOnFail: false,
	},
});

export interface UploadJobData {
	base64Data: string;
	folder: string;
	maxSizeMB: number;
	allowedFormats: string[];
	userId: string;
	oldPhotoFileName?: string;
}

export interface ForgotPasswordJobData {
	email: string;
	userName: string;
	resetLink: string;
}

export interface SendOtpJobData {
	email: string;
	userName: string;
	otp: string;
	purpose: string;
}

export const processForgotPasswordJob = async (data: ForgotPasswordJobData) => {
	logger.info({ email: data.email }, "Processing forgot-password job...");

	const html = generateResetPasswordEmail(data.userName, data.resetLink);

	await sendEmail({
		to: data.email,
		subject: "Reset Password",
		html,
		fromName: process.env.APP_NAME,
		fromEmail: process.env.SMTP_USER,
	});

	logger.info({ email: data.email }, "Forgot-password email sent");

	return { success: true };
};

export const processSendOtpJob = async (data: SendOtpJobData) => {
	logger.info({ email: data.email, purpose: data.purpose }, "Processing send-otp job...");

	const html = generateGenericOTPEmail({
		userName: data.userName,
		otp: data.otp,
		purpose: data.purpose,
		expiryMinutes: 5,
	});

	await sendEmail({
		to: data.email,
		subject: `Kode OTP - ${data.purpose}`,
		html,
		fromName: process.env.APP_NAME,
		fromEmail: process.env.SMTP_USER,
	});

	logger.info({ email: data.email, purpose: data.purpose }, "OTP email sent");

	return { success: true };
};

export const processUploadJob = async (data: UploadJobData) => {
	logger.info({ userId: data.userId, folder: data.folder }, "Starting upload processing job...");

	const result = await uploadBase64(data.folder, data.base64Data, data.maxSizeMB, data.allowedFormats);

	await authRepository.transaction(async (tx: any) => {
		await authRepository.updateUserProfile(data.userId, { photo: result.fileName }, undefined, tx);
	});

	if (data.oldPhotoFileName) {
		await deleteFile(data.folder, data.oldPhotoFileName, { strict: false });
	}

	logger.info({ userId: data.userId, fileName: result.fileName }, "Upload processing completed successfully.");

	return { success: true, fileName: result.fileName };
};

const shouldRunWorker = process.env.NODE_ENV === "development" || process.argv[1]?.includes("worker");

export let authWorker: Worker | null = null;

if (shouldRunWorker) {
	authWorker = new Worker(
		AUTH_QUEUE_NAME,
		async (job: Job) => {
			try {
				logger.info(
					{
						jobId: job.id,
						jobName: job.name,
						attempt: job.attemptsMade + 1,
						maxAttempts: job.opts.attempts,
					},
					"Processing job...",
				);

				switch (job.name) {
					case "upload-profile-photo":
						return await processUploadJob(job.data as UploadJobData);
					case "send-forgot-password-email":
						return await processForgotPasswordJob(job.data as ForgotPasswordJobData);
					case "send-otp-email":
						return await processSendOtpJob(job.data as SendOtpJobData);
					default:
						logger.warn({ jobName: job.name }, "Unknown job name");
						return null;
				}
			} catch (error) {
				const attemptsLeft = (job.opts.attempts || 3) - job.attemptsMade - 1;
				logger.error(
					{
						err: error,
						jobId: job.id,
						jobName: job.name,
						attempt: job.attemptsMade + 1,
						maxAttempts: job.opts.attempts,
						attemptsLeft,
						willRetry: attemptsLeft > 0,
					},
					"Error processing job",
				);
				throw error;
			}
		},
		{
			connection: bullConnection,
			concurrency: 5,
		},
	);

	authWorker.on("active", (job) => {
		logger.info(
			{
				jobId: job.id,
				jobName: job.name,
				timestamp: new Date().toISOString(),
			},
			"Job started processing",
		);
	});

	authWorker.on("completed", (job) => {
		const duration = job.finishedOn ? job.finishedOn - (job.processedOn || job.finishedOn) : undefined;
		logger.info(
			{
				jobId: job.id,
				jobName: job.name,
				duration,
				attempts: job.attemptsMade + 1,
			},
			"Job completed",
		);
	});

	authWorker.on("failed", (job, err) => {
		const attemptsMade = job?.attemptsMade ?? 0;
		const maxAttempts = job?.opts.attempts ?? 3;
		const willRetry = attemptsMade < maxAttempts - 1;
		logger.error(
			{
				jobId: job?.id,
				jobName: job?.name,
				err,
				attemptsMade,
				maxAttempts,
				willRetry,
			},
			"Job failed",
		);
	});

	authWorker.on("error", (err) => {
		logger.error({ err }, "Worker connection error");
	});

	logger.info(`Worker for ${AUTH_QUEUE_NAME} started`);
}
