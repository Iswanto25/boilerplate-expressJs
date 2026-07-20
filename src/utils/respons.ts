import { Response, Request } from "express";
import prisma from "@/configs/database.js";
import { jwtUtils } from "@/utils/jwt.js";
import { getStoredToken } from "@/utils/tokenStore.js";
import { logger, formatIsoWithTz } from "@/utils/logger.js";
import { saveAuditLog } from "@/utils/auditLogger.js";
import { maskSensitive, truncateLongStrings } from "@/middlewares/requestContext.js";

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

function buildLogRequest(req?: Request): Record<string, unknown> {
  if (!req) return {};
  const hasQuery = Object.keys(req.query).length > 0;
  return {
    ...(req.rawBody as Record<string, unknown> | undefined),
    ...(hasQuery ? { query: req.query } : {}),
  };
}

function buildLogResponse(payload: unknown, resTime: string, fallbackKey: "data" | "error" = "data"): Record<string, any> {
  const processed = truncateLongStrings(maskSensitive(payload));
  if (processed === null || processed === undefined) {
    return { resTime };
  }
  if (typeof processed === "object" && !Array.isArray(processed)) {
    return { ...(processed as Record<string, any>), resTime };
  }
  return { [fallbackKey]: processed, resTime };
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

    const reqBody = truncateLongStrings(maskSensitive(buildLogRequest(req))) as Record<string, unknown>;

    const logPayload = {
      level: "INFO",
      time: isoNow,
      path,
      method: req.method,
      status: code,
      reqId: req.reqId,
      userId: logUser.id || null,
      userRole: logUser.role || "GUEST",
      request: { ...reqBody, reqTime: formatIsoWithTz(new Date(startTime)) },
      response: buildLogResponse(data, isoNow, "data"),
      userAgent: req.headers["user-agent"] || "Unknown",
      durationMs: responseTime,
      msg: "HTTP Transaction completed",
    };

    logger.info(logPayload);

    saveAuditLog({
      userId: logUser.id || null,
      name: logUser.name,
      role: logUser.role,
      ip,
      host: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      status: code.toString(),
      method: req.method,
      reqId: req.reqId,
      data: logPayload,
      date: new Date(now),
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

    const reqBody = truncateLongStrings(maskSensitive(buildLogRequest(req))) as Record<string, unknown>;

    const logPayload = {
      level: "ERROR",
      time: isoNow,
      path,
      method: req?.method || "UNKNOWN",
      status: code,
      reqId: req?.reqId,
      userId: logUser.id || null,
      userRole: logUser.role || "GUEST",
      request: { ...reqBody, reqTime: formatIsoWithTz(new Date(startTime)) },
      response: buildLogResponse(error, isoNow, "error"),
      userAgent: req?.headers["user-agent"] || "Unknown",
      durationMs: responseTime,
      ...(hint ? { hint } : {}),
      msg: "HTTP Transaction completed",
    };

    logger.error(logPayload);

    saveAuditLog({
      userId: logUser.id || null,
      name: logUser.name,
      role: logUser.role,
      ip,
      host: req ? `${req.protocol}://${req.get("host")}${req.originalUrl}` : "",
      status: code.toString(),
      method: req?.method || "UNKNOWN",
      reqId: req?.reqId,
      data: logPayload,
      date: new Date(now),
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
