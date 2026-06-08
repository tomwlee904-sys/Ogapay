-- Add WURK-style profile fields to worker_profiles
ALTER TABLE "worker_profiles" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
ALTER TABLE "worker_profiles" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "worker_profiles" ADD COLUMN IF NOT EXISTS "categories" TEXT[] DEFAULT '{}';
ALTER TABLE "worker_profiles" ADD COLUMN IF NOT EXISTS "portfolio" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "worker_profiles" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
ALTER TABLE "worker_profiles" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN DEFAULT true;
