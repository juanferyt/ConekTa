ALTER TYPE "SkillLevel" RENAME TO "SkillLevel_old";
CREATE TYPE "SkillLevel" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');
ALTER TABLE "candidate_skills" ALTER COLUMN "level" DROP DEFAULT;
ALTER TABLE "candidate_skills" ALTER COLUMN "level" TYPE "SkillLevel" USING (
  CASE WHEN "level"::text = 'BEGINNER' THEN 'BASIC' WHEN "level"::text = 'EXPERT' THEN 'ADVANCED' ELSE "level"::text END
)::"SkillLevel";
ALTER TABLE "candidate_skills" ALTER COLUMN "level" SET DEFAULT 'BASIC';
DROP TYPE "SkillLevel_old";

CREATE TYPE "SkillType" AS ENUM ('TECHNICAL', 'SOFT');
CREATE TYPE "EducationStatus" AS ENUM ('ESTUDIANDO', 'GRADUADO');
CREATE TYPE "WorkSchedule" AS ENUM ('FULL_TIME', 'PART_TIME', 'FLEXIBLE');
CREATE TYPE "WorkModality" AS ENUM ('PRESENCIAL', 'HIBRIDO', 'REMOTO');

ALTER TABLE "candidate_profiles"
  ADD COLUMN "region" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "photoUrl" TEXT,
  ADD COLUMN "linkedinUrl" TEXT,
  ADD COLUMN "githubUrl" TEXT,
  ADD COLUMN "portfolioUrl" TEXT,
  ADD COLUMN "availableNow" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "workSchedule" "WorkSchedule",
  ADD COLUMN "modalities" "WorkModality"[] DEFAULT ARRAY[]::"WorkModality"[],
  ADD COLUMN "professionalInterests" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "skills" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "skills" ADD COLUMN "type" "SkillType" NOT NULL DEFAULT 'TECHNICAL';
ALTER TABLE "skills" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "skills" ALTER COLUMN "type" DROP DEFAULT;

ALTER TABLE "projects"
  ADD COLUMN "role" TEXT NOT NULL DEFAULT 'Participante',
  ADD COLUMN "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "githubUrl" TEXT,
  ADD COLUMN "projectDate" TIMESTAMP(3),
  ADD COLUMN "projectType" TEXT NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN "universityProject" BOOLEAN NOT NULL DEFAULT false;
UPDATE "projects" SET "projectDate" = COALESCE("completedAt", "startedAt", "createdAt");
ALTER TABLE "projects" ALTER COLUMN "projectDate" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "projectType" DROP DEFAULT;

UPDATE "certifications" SET "issuedAt" = "createdAt" WHERE "issuedAt" IS NULL;
ALTER TABLE "certifications" ALTER COLUMN "issuedAt" SET NOT NULL;

CREATE TABLE "educations" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "program" TEXT NOT NULL,
  "academicLevel" TEXT NOT NULL,
  "semester" INTEGER,
  "status" "EducationStatus" NOT NULL,
  "expectedGraduationDate" TIMESTAMP(3),
  "graduationDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "educations_candidateId_idx" ON "educations"("candidateId");
ALTER TABLE "educations" ADD CONSTRAINT "educations_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
