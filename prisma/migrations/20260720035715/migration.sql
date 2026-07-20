/*
  Warnings:

  - The `date` column on the `logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ip` column on the `logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "logs" DROP COLUMN "date",
ADD COLUMN     "date" DATE,
DROP COLUMN "ip",
ADD COLUMN     "ip" INET;

-- CreateIndex
CREATE INDEX "logs_date_idx" ON "logs"("date");
