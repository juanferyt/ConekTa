-- CreateEnum
CREATE TYPE "ContributionValidationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "skill_evidence" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "declaredScore" INTEGER NOT NULL DEFAULT 0,
    "projectScore" INTEGER NOT NULL DEFAULT 0,
    "verifiedScore" INTEGER NOT NULL DEFAULT 0,
    "consistencyScore" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "projectCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2),
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_contributions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "validatorName" TEXT NOT NULL,
    "validatorEmail" TEXT NOT NULL,
    "contributionRole" TEXT NOT NULL,
    "contributionSummary" TEXT NOT NULL,
    "skillIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContributionValidationStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_opportunity_indexes" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "responseRate" INTEGER NOT NULL,
    "processCompletionRate" INTEGER NOT NULL,
    "feedbackRate" INTEGER NOT NULL,
    "juniorFriendlyRate" INTEGER NOT NULL,
    "selectionRate" INTEGER NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_opportunity_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_passports" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_passports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skill_evidence_candidateId_totalScore_idx" ON "skill_evidence"("candidateId", "totalScore");

-- CreateIndex
CREATE INDEX "skill_evidence_skillId_totalScore_idx" ON "skill_evidence"("skillId", "totalScore");

-- CreateIndex
CREATE UNIQUE INDEX "skill_evidence_candidateId_skillId_key" ON "skill_evidence"("candidateId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "project_contributions_tokenHash_key" ON "project_contributions"("tokenHash");

-- CreateIndex
CREATE INDEX "project_contributions_candidateId_status_idx" ON "project_contributions"("candidateId", "status");

-- CreateIndex
CREATE INDEX "project_contributions_projectId_status_idx" ON "project_contributions"("projectId", "status");

-- CreateIndex
CREATE INDEX "project_contributions_validatorEmail_status_idx" ON "project_contributions"("validatorEmail", "status");

-- CreateIndex
CREATE UNIQUE INDEX "company_opportunity_indexes_companyId_key" ON "company_opportunity_indexes"("companyId");

-- CreateIndex
CREATE INDEX "company_opportunity_indexes_score_sampleSize_idx" ON "company_opportunity_indexes"("score", "sampleSize");

-- CreateIndex
CREATE UNIQUE INDEX "talent_passports_candidateId_key" ON "talent_passports"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "talent_passports_publicCode_key" ON "talent_passports"("publicCode");

-- CreateIndex
CREATE INDEX "talent_passports_active_updatedAt_idx" ON "talent_passports"("active", "updatedAt");

-- AddForeignKey
ALTER TABLE "skill_evidence" ADD CONSTRAINT "skill_evidence_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_evidence" ADD CONSTRAINT "skill_evidence_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_contributions" ADD CONSTRAINT "project_contributions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_contributions" ADD CONSTRAINT "project_contributions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_opportunity_indexes" ADD CONSTRAINT "company_opportunity_indexes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_passports" ADD CONSTRAINT "talent_passports_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
