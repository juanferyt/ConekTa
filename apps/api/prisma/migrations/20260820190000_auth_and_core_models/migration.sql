ALTER TYPE "UserRole" RENAME VALUE 'TALENT' TO 'CANDIDATE';

CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
CREATE TYPE "VacancyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

ALTER TABLE "users"
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "refreshTokenHash" TEXT;

CREATE TABLE "candidate_profiles" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "firstName" TEXT, "lastName" TEXT,
  "headline" TEXT, "bio" TEXT, "city" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "candidate_profiles_userId_key" ON "candidate_profiles"("userId");

CREATE TABLE "company_profiles" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT, "description" TEXT, "website" TEXT,
  "city" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "company_profiles_userId_key" ON "company_profiles"("userId");

CREATE TABLE "skills" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

CREATE TABLE "candidate_skills" (
  "candidateId" TEXT NOT NULL, "skillId" TEXT NOT NULL, "level" "SkillLevel" NOT NULL DEFAULT 'BEGINNER',
  CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("candidateId", "skillId")
);

CREATE TABLE "vacancies" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "location" TEXT, "remote" BOOLEAN NOT NULL DEFAULT false, "status" "VacancyStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vacancies_companyId_status_idx" ON "vacancies"("companyId", "status");

CREATE TABLE "vacancy_skills" (
  "vacancyId" TEXT NOT NULL, "skillId" TEXT NOT NULL, "required" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "vacancy_skills_pkey" PRIMARY KEY ("vacancyId", "skillId")
);

CREATE TABLE "projects" (
  "id" TEXT NOT NULL, "candidateId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "url" TEXT, "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "projects_candidateId_idx" ON "projects"("candidateId");

CREATE TABLE "certifications" (
  "id" TEXT NOT NULL, "candidateId" TEXT NOT NULL, "name" TEXT NOT NULL, "issuingEntity" TEXT NOT NULL,
  "credentialUrl" TEXT, "issuedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "certifications_candidateId_idx" ON "certifications"("candidateId");

CREATE TABLE "applications" (
  "id" TEXT NOT NULL, "candidateId" TEXT NOT NULL, "vacancyId" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED', "coverLetter" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "applications_candidateId_vacancyId_key" ON "applications"("candidateId", "vacancyId");
CREATE INDEX "applications_vacancyId_status_idx" ON "applications"("vacancyId", "status");

ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vacancy_skills" ADD CONSTRAINT "vacancy_skills_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vacancy_skills" ADD CONSTRAINT "vacancy_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
