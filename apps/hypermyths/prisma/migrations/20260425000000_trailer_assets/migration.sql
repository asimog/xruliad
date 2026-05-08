-- CreateTable
CREATE TABLE "TrailerAsset" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "creatorId" TEXT,
    "creatorEmail" TEXT,
    "ownerWallet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "slug" TEXT,
    "treeAddress" TEXT,
    "collectionAddress" TEXT,
    "assetId" TEXT,
    "mintSignature" TEXT,
    "paymentAddress" TEXT,
    "quotedLamports" BIGINT NOT NULL DEFAULT 0,
    "paidLamports" BIGINT NOT NULL DEFAULT 0,
    "paymentSignature" TEXT,
    "metadataUri" TEXT,
    "metadataTxId" TEXT,
    "posterUri" TEXT,
    "posterTxId" TEXT,
    "animationUri" TEXT,
    "mintedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailerAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrailerAsset_jobId_key" ON "TrailerAsset"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "TrailerAsset_slug_key" ON "TrailerAsset"("slug");

-- CreateIndex
CREATE INDEX "TrailerAsset_creatorId_createdAt_idx" ON "TrailerAsset"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TrailerAsset_status_createdAt_idx" ON "TrailerAsset"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TrailerAsset_visibility_publishedAt_idx" ON "TrailerAsset"("visibility", "publishedAt" DESC);

-- AddForeignKey
ALTER TABLE "TrailerAsset" ADD CONSTRAINT "TrailerAsset_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("jobId") ON DELETE CASCADE ON UPDATE CASCADE;
