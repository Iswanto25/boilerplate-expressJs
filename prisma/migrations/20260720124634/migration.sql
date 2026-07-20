/*
  Warnings:

  - A unique constraint covering the columns `[email,status,code]` on the table `otp` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "otp_email_key";

-- AlterTable
ALTER TABLE "otp" ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "otp_email_status_code_key" ON "otp"("email", "status", "code");
