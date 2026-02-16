-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CASE_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'CLINICIAN_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'CLINICIAN_REJECTED';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "resourceId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_resourceId_idx" ON "AuditLog"("resourceId");
