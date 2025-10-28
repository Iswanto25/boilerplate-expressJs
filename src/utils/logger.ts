import pino from "pino";
import path from "path";
import fs from "fs";
import moment from "moment";
import dotenv from "dotenv";
dotenv.config({ quiet: process.env.NODE_ENV === "production" });


const isProd = process.env.NODE_ENV === "production";

const logDir = path.join(process.cwd(), "logger");
if (!fs.existsSync(logDir)) {
	fs.mkdirSync(logDir, { recursive: true });
}

const filePath = path.join(logDir, `${moment().format("YYYY-MM-DD")}.log`);

const devTransport = pino.transport({
	targets: [
		{
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "HH:MM:ss",
				singleLine: true,
				ignore: "pid,hostname",
			},
		},
		{
			target: "pino/file",
			options: { destination: filePath, mkdir: true, append: true },
		},
	],
});

const prodTransport = pino.transport({
	target: "pino/file",
	options: { destination: filePath, mkdir: true, append: true },
});

export const logger = pino(
	{
		level: isProd ? "info" : "debug",
		base: undefined,
		timestamp: pino.stdTimeFunctions.isoTime,
	},
	isProd ? prodTransport : devTransport,
);
