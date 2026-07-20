import pino from "pino";
import path from "path";
import fs from "node:fs";
import pretty from "pino-pretty";

const isProd = process.env.NODE_ENV === "production";

export const getLogLevel = (env?: string): string => ((env ?? process.env.NODE_ENV) === "production" ? "info" : "debug");

const logDir = path.join(process.cwd(), "logger");
const now = new Date();
const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const filePath = path.join(logDir, `${dateStr}.log`);

fs.mkdirSync(logDir, { recursive: true });

const consoleStream = pretty({
  colorize: true,
  translateTime: "HH:MM:ss",
  ignore: "pid,hostname",
  singleLine: true,
  messageFormat: "{msg}",
});

const fileStream = fs.createWriteStream(filePath, { flags: "a" });

const multiStream = pino.multistream([
  { stream: consoleStream, level: isProd ? "info" : "debug" },
  { stream: fileStream, level: getLogLevel() },
]);

export function formatIsoWithTz(date: Date = new Date()): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absOff = Math.abs(offset);
  const oz = `${sign}${String(Math.floor(absOff / 60)).padStart(2, "0")}:${String(absOff % 60).padStart(2, "0")}`;

  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${ms}${oz}`;
}

const timestampWithTz = () => `,"time":"${formatIsoWithTz()}"`;

export const logger = pino(
  {
    level: isProd ? "info" : "debug",
    base: undefined,
    timestamp: timestampWithTz,
    formatters: {
      level(label) {
        return { level: label.toUpperCase() };
      },
    },
  },
  multiStream,
);
