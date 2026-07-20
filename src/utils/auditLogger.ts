import prisma from "@/configs/database.js";
import { logger } from "@/utils/logger.js";

interface AuditEntry {
  userId?: string | null;
  name?: string | null;
  role?: string | null;
  ip: string;
  host: string;
  status: string;
  method: string;
  reqId?: string;
  data: any;
  date: Date | string;
}

const WORKER_COUNT = 10;
const BUFFER_SIZE = 1000;
const WRITE_TIMEOUT_MS = 5000;

const queue: AuditEntry[] = [];
let processing = false;

async function writeToDb(entry: AuditEntry): Promise<void> {
  const timeout = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("write timeout")), WRITE_TIMEOUT_MS)
  );

  const write = prisma.logs.create({ data: entry });

  try {
    await Promise.race([write, timeout]);
  } catch (error) {
    logger.warn({ error }, "Failed to write audit log to database");
  }
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const batch = queue.splice(0, WORKER_COUNT);
    await Promise.all(batch.map(writeToDb));
  }

  processing = false;
}

export function saveAuditLog(entry: AuditEntry): void {
  if (queue.length >= BUFFER_SIZE) {
    logger.warn("Audit log queue is full, dropping entry");
    return;
  }

  queue.push(entry);
  processQueue();
}
