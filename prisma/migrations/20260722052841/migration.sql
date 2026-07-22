-- CreateIndex
CREATE INDEX "otp_userId_idx" ON "otp"("userId");

-- CreateIndex
CREATE INDEX "resource_moduleId_idx" ON "resource"("moduleId");

-- CreateIndex
CREATE INDEX "user_roleId_idx" ON "user"("roleId");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");
