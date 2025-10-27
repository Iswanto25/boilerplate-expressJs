/*
  Warnings:

  - The primary key for the `refreshToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[token]` on the table `refreshToken` will be added. If there are existing duplicate values, this will fail.
  - Made the column `token` on table `refreshToken` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('MANUAL', 'GOOGLE');

-- DropIndex
DROP INDEX "public"."refreshToken_userId_key";

-- AlterTable
ALTER TABLE "refreshToken" DROP CONSTRAINT "refreshToken_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "token" SET NOT NULL,
ADD CONSTRAINT "refreshToken_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user" DROP CONSTRAINT "user_pkey",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "providerId" TEXT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "refreshToken_token_key" ON "refreshToken"("token");

-- AddForeignKey
ALTER TABLE "refreshToken" ADD CONSTRAINT "refreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
