-- Pay.sh intermediary accounting.
-- Existing migrations are append-only; this adds durable quote and spend ledgers.

CREATE TABLE "PayShQuote" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rail" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'quoted',
    "subtotalUsd" DOUBLE PRECISION NOT NULL,
    "platformFeeUsd" DOUBLE PRECISION NOT NULL,
    "bufferUsd" DOUBLE PRECISION NOT NULL,
    "totalUsd" DOUBLE PRECISION NOT NULL,
    "totalLamports" BIGINT NOT NULL DEFAULT 0,
    "totalUsdcMicros" BIGINT NOT NULL DEFAULT 0,
    "platformFeeBps" INTEGER NOT NULL DEFAULT 0,
    "bufferBps" INTEGER NOT NULL DEFAULT 0,
    "paymentAddress" TEXT,
    "payerAddress" TEXT,
    "paymentSignature" TEXT,
    "x402Transaction" TEXT,
    "operations" JSONB NOT NULL,
    "inputDigest" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "sweepStatus" TEXT NOT NULL DEFAULT 'pending',
    "sweepSignature" TEXT,
    "sweepError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayShQuote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayShSpend" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "quotedUsd" DOUBLE PRECISION NOT NULL,
    "paidUsd" DOUBLE PRECISION,
    "requestHash" TEXT NOT NULL,
    "responseDigest" TEXT,
    "payShRequestId" TEXT,
    "x402Transaction" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayShSpend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayShQuote_paymentSignature_key" ON "PayShQuote"("paymentSignature");
CREATE INDEX "PayShQuote_jobId_idx" ON "PayShQuote"("jobId");
CREATE INDEX "PayShQuote_status_expiresAt_idx" ON "PayShQuote"("status", "expiresAt");
CREATE INDEX "PayShQuote_inputDigest_kind_createdAt_idx" ON "PayShQuote"("inputDigest", "kind", "createdAt" DESC);
CREATE INDEX "PayShSpend_quoteId_idx" ON "PayShSpend"("quoteId");
CREATE INDEX "PayShSpend_jobId_idx" ON "PayShSpend"("jobId");
CREATE INDEX "PayShSpend_endpointId_status_idx" ON "PayShSpend"("endpointId", "status");

ALTER TABLE "PayShQuote" ADD CONSTRAINT "PayShQuote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("jobId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayShSpend" ADD CONSTRAINT "PayShSpend_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PayShQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayShSpend" ADD CONSTRAINT "PayShSpend_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("jobId") ON DELETE CASCADE ON UPDATE CASCADE;
