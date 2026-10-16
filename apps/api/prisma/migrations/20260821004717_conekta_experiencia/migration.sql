-- CreateEnum
CREATE TYPE "ExperienceOpportunityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExperienceApplicationStatus" AS ENUM ('APPLIED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExperienceCertificateStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "experience_opportunities" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "activities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "professionalArea" TEXT NOT NULL,
    "modality" "WorkModality" NOT NULL,
    "city" TEXT,
    "estimatedDurationWeeks" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "participantLimit" INTEGER NOT NULL DEFAULT 1,
    "expectedDeliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ExperienceOpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_skills" (
    "experienceId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "priority" "VacancySkillPriority" NOT NULL DEFAULT 'REQUIRED',
    "weight" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "experience_skills_pkey" PRIMARY KEY ("experienceId","skillId")
);

-- CreateTable
CREATE TABLE "experience_applications" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "compatibilityScore" INTEGER NOT NULL,
    "status" "ExperienceApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "motivation" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_submissions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "workDescription" TEXT NOT NULL,
    "projectUrl" TEXT NOT NULL,
    "githubUrl" TEXT,
    "additionalLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comments" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_evaluations" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "compliance" INTEGER NOT NULL,
    "quality" INTEGER NOT NULL,
    "responsibility" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "teamwork" INTEGER NOT NULL,
    "technicalSkills" INTEGER NOT NULL,
    "finalResult" INTEGER NOT NULL,
    "companyComment" TEXT NOT NULL,
    "recommendation" TEXT,
    "verifiedSkillIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verified_experiences" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verified_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verified_skills" (
    "verifiedExperienceId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "verified_skills_pkey" PRIMARY KEY ("verifiedExperienceId","skillId")
);

-- CreateTable
CREATE TABLE "experience_certificates" (
    "id" TEXT NOT NULL,
    "verifiedExperienceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ExperienceCertificateStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "experience_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experience_opportunities_companyId_status_idx" ON "experience_opportunities"("companyId", "status");

-- CreateIndex
CREATE INDEX "experience_opportunities_status_publishedAt_idx" ON "experience_opportunities"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "experience_skills_skillId_idx" ON "experience_skills"("skillId");

-- CreateIndex
CREATE INDEX "experience_applications_candidateId_status_idx" ON "experience_applications"("candidateId", "status");

-- CreateIndex
CREATE INDEX "experience_applications_experienceId_status_idx" ON "experience_applications"("experienceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "experience_applications_experienceId_candidateId_key" ON "experience_applications"("experienceId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "experience_submissions_applicationId_key" ON "experience_submissions"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "experience_evaluations_applicationId_key" ON "experience_evaluations"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "verified_experiences_applicationId_key" ON "verified_experiences"("applicationId");

-- CreateIndex
CREATE INDEX "verified_experiences_candidateId_completedAt_idx" ON "verified_experiences"("candidateId", "completedAt");

-- CreateIndex
CREATE INDEX "verified_skills_skillId_idx" ON "verified_skills"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "experience_certificates_verifiedExperienceId_key" ON "experience_certificates"("verifiedExperienceId");

-- CreateIndex
CREATE UNIQUE INDEX "experience_certificates_code_key" ON "experience_certificates"("code");

-- CreateIndex
CREATE INDEX "experience_certificates_status_issuedAt_idx" ON "experience_certificates"("status", "issuedAt");

-- AddForeignKey
ALTER TABLE "experience_opportunities" ADD CONSTRAINT "experience_opportunities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_skills" ADD CONSTRAINT "experience_skills_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experience_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_skills" ADD CONSTRAINT "experience_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_applications" ADD CONSTRAINT "experience_applications_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experience_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_applications" ADD CONSTRAINT "experience_applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_submissions" ADD CONSTRAINT "experience_submissions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "experience_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_evaluations" ADD CONSTRAINT "experience_evaluations_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "experience_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_experiences" ADD CONSTRAINT "verified_experiences_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "experience_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_experiences" ADD CONSTRAINT "verified_experiences_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_skills" ADD CONSTRAINT "verified_skills_verifiedExperienceId_fkey" FOREIGN KEY ("verifiedExperienceId") REFERENCES "verified_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_skills" ADD CONSTRAINT "verified_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_certificates" ADD CONSTRAINT "experience_certificates_verifiedExperienceId_fkey" FOREIGN KEY ("verifiedExperienceId") REFERENCES "verified_experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
