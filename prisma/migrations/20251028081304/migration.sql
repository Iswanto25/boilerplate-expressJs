-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('MANUAL', 'GOOGLE');

-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "date" TEXT,
    "name" TEXT,
    "role" TEXT,
    "host" TEXT,
    "status" TEXT,
    "data" JSONB,
    "userId" TEXT,
    "ip" TEXT,
    "method" TEXT,
    "dayCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logs_date_idx" ON "logs"("date");

-- CreateIndex
CREATE INDEX "logs_userId_idx" ON "logs"("userId");
