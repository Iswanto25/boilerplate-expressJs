import { mock } from "node:test";
import request from "supertest";

mock.module("@/middlewares/authMiddleware.js", {
  exports: {
    authenticate: {
      verifyToken: (req, _res, next) => {
        req.user = { id: "test-user-id", email: "test@example.com", roleName: "USER" };
        next();
      },
    },
  },
});

mock.module("@/configs/database.js", {
  exports: { default: { user: { findUnique: () => null }, logs: { create: () => {} } } },
});

mock.module("@/configs/redis.js", {
  exports: { redisState: { client: null, isAvailable: false } },
});

mock.module("@/configs/bull.js", {
  exports: { bullConnection: {} },
});

mock.module("@/utils/s3", { exports: { s3: {}, isS3Configured: true, getPublicUrl: () => null } });
mock.module("@/utils/tokenStore", { exports: { storeToken: () => Promise.resolve(), getStoredToken: () => Promise.resolve("token"), deleteToken: () => Promise.resolve() } });
mock.module("@/utils/encryption", { exports: { encryptionUtils: { encryptSensitive: () => ({}) }, decryptSensitive: () => "" } });
mock.module("@/features/auth/jobs/auth.jobs.js", { exports: { authQueue: { add: () => Promise.resolve({ id: "job-1" }) } } });

const { app } = await import("@/configs/express.js");
const response = await request(app).post("/api/auth/refresh-token").send({});
console.log("Status:", response.status);
console.log("Body:", JSON.stringify(response.body));
process.exit(0);
