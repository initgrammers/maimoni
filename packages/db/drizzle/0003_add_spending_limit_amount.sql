ALTER TABLE "boards"
ADD COLUMN IF NOT EXISTS "spending_limit_amount" numeric(12, 2);
