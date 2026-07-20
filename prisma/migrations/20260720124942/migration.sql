/*
  Warnings:

  - The `status` column on the `otp` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `expiredAt` to the `otp` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "statusOTP" AS ENUM ('active', 'used', 'expired');

-- AlterTable
ALTER TABLE "otp" ADD COLUMN     "expiredAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "statusOTP" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE UNIQUE INDEX "otp_email_status_code_key" ON "otp"("email", "status", "code");
