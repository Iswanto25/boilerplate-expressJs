import { Response, Request } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "@/configs/database.js";
import { jwtUtils } from "@/utils/jwt.js";
import { getStoredToken } from "@/utils/tokenStore.js";
import { logger, formatIsoWithTz } from "@/utils/logger.js";
import { formatDateTime } from "@/utils/utils.js";
import { saveAuditLog } from "@/utils/auditLogger.js";
import { maskSensitive } from "@/middlewares/requestContext.js";

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  PAYLOAD_TOO_LARGE = 413,
  UNPROCESSABLE_ENTITY = 422,
  UNSUPPORTED_MEDIA_TYPE = 415,
  TOO_MANY_REQUESTS = 429,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  INTERNAL_SERVER_ERROR = 500,
}

interface LogUser {
  id?: string;
  name: string;
  role: string | null;
}

async function getLogUser(req?: Request): Promise<LogUser> {
  if (!req) return { name: "Guest", role: null };

  if (req.user) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { profile: true, role: true },
      });
      if (user) {
        return {
          id: user.id,
          name: user.profile?.name || "Unknown",
          role: user.role?.name || null,
        };
      }
    } catch {
      return { name: "Unknown", role: null };
    }
  }

  const auth = req.headers?.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.split(" ")[1] : null;
  if (token) {
    try {
      const decoded = jwtUtils.verifyAccessToken(token);
      const storedToken = await getStoredToken(decoded.id, "access");
      if (storedToken === token) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          include: { profile: true, role: true },
        });
        if (user) {
          return {
            id: user.id,
            name: user.profile?.name || "Unknown",
            role: user.role?.name || null,
          };
        }
      }
    } catch {
      // Silent
    }
  }

  return { name: "Guest", role: null };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  return forwarded?.toString().split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}

export const respons = {
  async success(message: string, data: unknown, code: number, res: Response, req: Request, pagination?: any) {
    const logUser = await getLogUser(req);
    const ip = getClientIp(req);
    const startTime = req.startTime || Date.now();
    const now = Date.now();
    const responseTime = now - startTime;
    const path = req.path || req.originalUrl;
    const isoNow = formatIsoWithTz(new Date(now));

    logger.info({
      path,
      method: req.method,
      status: code,
      reqId: req.reqId,
      userId: logUser.id || null,
      request: {
        ...(req.rawBody as Record<string, unknown> | undefined),
        reqTime: formatIsoWithTz(new Date(startTime)),
      },
      response: {
        ...(maskSensitive(data) as Record<string, unknown>),
        resTime: isoNow,
      },
      userAgent: req.headers["user-agent"] || "Unknown",
      durationMs: responseTime,
    }, "HTTP Transaction completed");

    saveAuditLog({
      userId: logUser.id || null,
      name: logUser.name,
      role: logUser.role,
      ip,
      host: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      status: code.toString(),
      method: req.method,
      reqId: req.reqId,
      data: {
        userAgent: req.headers["user-agent"] || "Unknown",
        reqTime: formatDateTime(new Date(startTime)),
        resTime: formatDateTime(new Date(now)),
        source: "Success",
        message,
        response: data as Prisma.InputJsonValue,
        data: req.rawBody as Prisma.InputJsonValue,
      },
      date: formatDateTime(new Date(now)),
    });

    res.status(code).json({
      success: true,
      message,
      data,
      ...(pagination && { pagination }),
    });
  },

  async error(message: string, error: unknown, code: number, res: Response, req?: Request) {
    const logUser = await getLogUser(req);
    const ip = req ? getClientIp(req) : "";
    const startTime = req?.startTime || Date.now();
    const now = Date.now();
    const responseTime = now - startTime;
    const path = req?.path || req?.originalUrl || "unknown";
    const isoNow = formatIsoWithTz(new Date(now));
    const hint = (error as any)?.hint || (error as any)?.code || undefined;

    logger.error({
      path,
      method: req?.method || "UNKNOWN",
      status: code,
      reqId: req?.reqId,
      userId: logUser.id || null,
      request: {
        ...(req?.rawBody as Record<string, unknown> | undefined),
        reqTime: formatIsoWithTz(new Date(startTime)),
      },
      response: {
        ...(maskSensitive(error) as Record<string, unknown>),
        resTime: isoNow,
      },
      userAgent: req?.headers["user-agent"] || "Unknown",
      durationMs: responseTime,
      hint,
    }, "HTTP Transaction completed");

    saveAuditLog({
      userId: logUser.id || null,
      name: logUser.name,
      role: logUser.role,
      ip,
      host: req ? `${req.protocol}://${req.get("host")}${req.originalUrl}` : "",
      status: code.toString(),
      method: req?.method || "UNKNOWN",
      reqId: req?.reqId,
      data: {
        userAgent: req?.headers["user-agent"] || "Unknown",
        reqTime: formatDateTime(new Date(startTime)),
        resTime: formatDateTime(new Date(now)),
        source: "Error",
        message,
        hint,
        error: error as Prisma.InputJsonValue,
        data: req?.rawBody as Prisma.InputJsonValue | undefined,
      },
      date: formatDateTime(new Date(now)),
    });

    res.status(code).json({
      success: false,
      message,
      hint,
      error,
    });
  },
};

export class apiError extends Error {
  public statusCode: number;
  public hint?: string;

  constructor(statusCode: number, message: string, hint?: string) {
    super(message);
    this.statusCode = statusCode;
    this.hint = hint;
    logger.error({ statusCode, hint }, `${message}${hint ? ` (Hint: ${hint})` : ""}`);
    Error.captureStackTrace(this, this.constructor);
  }
}
