-- CreateTable
CREATE TABLE "JobRecoveryLock" (
    "jobId" TEXT NOT NULL,
    "lockUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRecoveryLock_pkey" PRIMARY KEY ("jobId")
);

-- CreateIndex
CREATE INDEX "JobRecoveryLock_lockUntil_idx" ON "JobRecoveryLock"("lockUntil");
