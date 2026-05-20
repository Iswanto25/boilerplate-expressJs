import pino from "pino";
import path from "path";

const isProd = process.env.NODE_ENV === "production";

export const getLogLevel = (env?: string): string => ((env ?? process.env.NODE_ENV) === "production" ? "info" : "debug");

const logDir = path.join(process.cwd(), "logger");
const now = new Date();
const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const filePath = path.join(logDir, `${dateStr}.log`);

const transport = pino.transport({
	targets: [
		{
			target: "pino/file",
			options: { destination: filePath as any, mkdir: true, append: true },
			level: getLogLevel(),
		},
		{
			target: isProd ? "pino/file" : "pino-pretty",
			options:
				isProd ?
					({ destination: 1 } as any)
				:	{
						colorize: true,
						translateTime: "HH:MM:ss",
						ignore: "pid,hostname,req,res",
						singleLine: true,
						messageFormat: "{msg}",
					},
			level: isProd ? "info" : "debug",
		},
	],
});

export const logger = pino(
	{
		level: isProd ? "info" : "debug",
		base: undefined,
		timestamp: pino.stdTimeFunctions.isoTime,
		serializers: {
			req: (req) => ({
				method: req.method,
				url: req.url,
				ip: req.remoteAddress,
			}),
			res: (res) => ({
				statusCode: res.statusCode,
			}),
		},
	},
	transport,
);
