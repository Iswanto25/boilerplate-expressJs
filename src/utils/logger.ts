import fs from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";
import pino from "pino";
import pretty from "pino-pretty";

export const getLogLevel = (env = process.env.NODE_ENV) => (env === "production" ? "info" : "debug");

export function formatIsoWithTz(date: Date = new Date()): string {
	const pad = (n: number, len = 2) => String(n).padStart(len, "0");
	const offset = -date.getTimezoneOffset();
	const sign = offset >= 0 ? "+" : "-";
	const abs = Math.abs(offset);
	const tz = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}${tz}`;
}

const logDir = path.join(process.cwd(), "logger");
fs.mkdirSync(logDir, { recursive: true });

const dateStr = new Date().toISOString().slice(0, 10);
const filePath = path.join(logDir, `${dateStr}.log`);

const prettyStream = pretty({
	colorize: true,
	translateTime: "yyyy-mm-dd HH:MM:ss",
	ignore: "pid,hostname",
	hideObject: true,
	messageFormat: (log, messageKey) => {
		if (log.method && log.path && log.status) {
			const role = ((log.userRole as string) || "GUEST").toUpperCase();
			const duration = log.durationMs !== undefined ? ` - ${log.durationMs}ms` : "";
			return `${log.method} ${log.path} ${log.status} | ${role}${duration}`;
		}
		const msg = (log[messageKey] as string) || "";
		const errObj = (log.err || log.error) as { message?: string } | undefined;
		if (errObj?.message && !msg.includes(errObj.message)) {
			return `${msg} (${errObj.message})`;
		}
		return msg;
	},
});

const consoleStream = new Writable({
	write(chunk, encoding, callback) {
		if (process.env.NODE_ENV === "production") {
			process.stdout.write(chunk, encoding, callback);
		} else {
			prettyStream.write(chunk, encoding, callback);
		}
	},
});

const fileStream = fs.createWriteStream(filePath, { flags: "a" });

const level = getLogLevel();

const multiStream = pino.multistream([
	{ stream: consoleStream, level },
	{ stream: fileStream, level },
]);

export const logger = pino(
	{
		level,
		base: undefined,
		timestamp: () => `,"time":"${formatIsoWithTz()}"`,
		formatters: {
			level: (label) => ({ level: label.toUpperCase() }),
		},
	},
	multiStream,
);
