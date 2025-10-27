-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "idUsers" TEXT,
    "username" TEXT,
    "role" TEXT,
    "ip" TEXT,
    "method" TEXT,
    "status" INTEGER,
    "host" TEXT,
    "services" TEXT,
    "date" TIMESTAMP(3),
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);
