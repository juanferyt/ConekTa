CREATE TYPE "CompanySize" AS ENUM ('MICRO', 'SMALL', 'MEDIUM', 'LARGE');
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "OpportunityType" AS ENUM ('FIRST_JOB', 'INTERNSHIP', 'APPRENTICESHIP', 'TRAINEE');
CREATE TYPE "VacancySkillPriority" AS ENUM ('REQUIRED', 'DESIRED');

ALTER TABLE "company_profiles"
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "nit" TEXT,
  ADD COLUMN "sector" TEXT,
  ADD COLUMN "size" "CompanySize",
  ADD COLUMN "country" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "linkedinUrl" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
CREATE UNIQUE INDEX "company_profiles_nit_key" ON "company_profiles"("nit");

ALTER TABLE "vacancies"
  ADD COLUMN "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "modality" "WorkModality" NOT NULL DEFAULT 'PRESENCIAL',
  ADD COLUMN "opportunityType" "OpportunityType" NOT NULL DEFAULT 'FIRST_JOB',
  ADD COLUMN "contractType" TEXT NOT NULL DEFAULT 'Por definir',
  ADD COLUMN "salaryMin" INTEGER,
  ADD COLUMN "salaryMax" INTEGER,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'COP',
  ADD COLUMN "showSalary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deadline" TIMESTAMP(3),
  ADD COLUMN "relatedCareers" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "maxExperienceMonths" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "experienceRequired" BOOLEAN NOT NULL DEFAULT false;
UPDATE "vacancies" SET "modality" = 'REMOTO' WHERE "remote" = true;
ALTER TABLE "vacancies" ALTER COLUMN "contractType" DROP DEFAULT;

ALTER TABLE "vacancy_skills"
  ADD COLUMN "priority" "VacancySkillPriority" NOT NULL DEFAULT 'REQUIRED',
  ADD COLUMN "weight" INTEGER NOT NULL DEFAULT 3;
UPDATE "vacancy_skills" SET "priority" = CASE WHEN "required" THEN 'REQUIRED'::"VacancySkillPriority" ELSE 'DESIRED'::"VacancySkillPriority" END;
