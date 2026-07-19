-- AlterTable
ALTER TABLE "logs" ADD COLUMN     "reqId" TEXT;

-- CreateIndex
CREATE INDEX "logs_reqId_idx" ON "logs"("reqId");
