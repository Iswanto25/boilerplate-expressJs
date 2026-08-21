/*
  Warnings:

  - The `availableActions` column on the `resource` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `grantedActions` column on the `rolePermission` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `otp` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[number]` on the table `module` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[number,moduleId]` on the table `resource` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `number` to the `module` table without a default value. This is not possible if the table is not empty.
  - Added the required column `number` to the `resource` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'DETAIL', 'LIST', 'IMPORT', 'EXPORT', 'ASSIGN', 'REVOKE');

-- DropForeignKey
ALTER TABLE "otp" DROP CONSTRAINT "otp_userId_fkey";

-- AlterTable
ALTER TABLE "module" ADD COLUMN     "number" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "resource" ADD COLUMN     "number" INTEGER NOT NULL,
DROP COLUMN "availableActions",
ADD COLUMN     "availableActions" "Action"[];

-- AlterTable
ALTER TABLE "rolePermission" DROP COLUMN "grantedActions",
ADD COLUMN     "grantedActions" "Action"[];

-- DropTable
DROP TABLE "otp";

-- DropEnum
DROP TYPE "statusOTP";

-- CreateIndex
CREATE UNIQUE INDEX "module_number_key" ON "module"("number");

-- CreateIndex
CREATE INDEX "module_number_idx" ON "module"("number");

-- CreateIndex
CREATE UNIQUE INDEX "resource_number_moduleId_key" ON "resource"("number", "moduleId");
