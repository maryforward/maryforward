-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedClinicianId" TEXT;

-- AlterTable
ALTER TABLE "CaseReport" ADD COLUMN     "authorId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "specialty" TEXT;

-- CreateIndex
CREATE INDEX "Case_assignedClinicianId_idx" ON "Case"("assignedClinicianId");

-- CreateIndex
CREATE INDEX "CaseReport_authorId_idx" ON "CaseReport"("authorId");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_assignedClinicianId_fkey" FOREIGN KEY ("assignedClinicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseReport" ADD CONSTRAINT "CaseReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
