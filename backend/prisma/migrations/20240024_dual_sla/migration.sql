-- Add response SLA hours to Project
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "slaResponseCriticalHours" INTEGER;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "slaResponseHighHours" INTEGER;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "slaResponseMediumHours" INTEGER;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "slaResponseLowHours" INTEGER;

-- Add response SLA deadline to Ticket
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "slaResponseDeadline" TIMESTAMP(3);
