-- DropForeignKey
ALTER TABLE "public"."refreshToken" DROP CONSTRAINT "refreshToken_userId_fkey";

-- AddForeignKey
ALTER TABLE "refreshToken" ADD CONSTRAINT "refreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
