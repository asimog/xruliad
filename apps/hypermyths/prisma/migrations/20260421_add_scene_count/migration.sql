-- Add sceneCount to Job to allow per-request act count for the premium multi-act engine
ALTER TABLE "Job" ADD COLUMN "sceneCount" INTEGER;
