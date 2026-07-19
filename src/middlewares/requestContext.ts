import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

const SENSITIVE_FIELDS = /password|token|secret|credential|authorization|api.?key|access.?token|refresh.?token/i;

declare module "express-serve-static-core" {
  interface Request {
    reqId: string;
    rawBody?: unknown;
  }
}

export function requestContext(req: Request, _res: Response, next: NextFunction): void {
  req.reqId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.startTime = Date.now();

  if (req.body && typeof req.body === "object" && Object.keys(req.body as object).length > 0) {
    req.rawBody = maskSensitive(cloneDeep(req.body));
  }

  next();
}

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function maskSensitive(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;

  if (Array.isArray(data)) {
    return data.map(maskSensitive);
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.test(key)) {
      masked[key] = "***";
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskSensitive(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}
