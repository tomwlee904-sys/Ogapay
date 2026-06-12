#!/bin/bash
# Pre-build: Drop FK constraint on job_listings that references auth.users
# Prisma cannot manage cross-schema FKs directly, so we drop it before db push
# and add it back after via Prisma's own schema handling.
echo "🔧 Pre-build: Dropping job_listings cross-schema FK..."
PGPASSWORD=$PGPASSWORD psql "$DATABASE_URL" -c "
  ALTER TABLE IF EXISTS public.job_listings 
  DROP CONSTRAINT IF EXISTS job_listings_employer_id_fkey;
" 2>/dev/null || echo "  (FK may not exist yet or psql unavailable)"
echo "✅ Pre-build: Done"
