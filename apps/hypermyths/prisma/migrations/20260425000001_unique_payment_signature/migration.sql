-- Make paymentSignature unique on TrailerAsset to prevent SOL payment replay attacks.
-- A single on-chain signature cannot be reused across multiple mint jobs.
-- NULLs are excluded from the unique index so rows without a payment are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "TrailerAsset_paymentSignature_key"
  ON "TrailerAsset" ("paymentSignature")
  WHERE "paymentSignature" IS NOT NULL;
