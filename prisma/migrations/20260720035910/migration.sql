/*
  Warnings:

  - You are about to drop the column `createdAt` on the `logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "logs" DROP COLUMN "createdAt",
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);
