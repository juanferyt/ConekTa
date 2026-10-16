ALTER TYPE "ApplicationStatus" RENAME VALUE 'SUBMITTED' TO 'APPLIED';
ALTER TYPE "ApplicationStatus" RENAME VALUE 'REVIEWING' TO 'UNDER_REVIEW';
ALTER TYPE "ApplicationStatus" RENAME VALUE 'ACCEPTED' TO 'SELECTED';

ALTER TABLE "applications" ADD COLUMN "companyId" TEXT;
ALTER TABLE "applications" ADD COLUMN "compatibilityScore" INTEGER NOT NULL DEFAULT 0;
UPDATE "applications" AS application
SET "companyId" = vacancy."companyId"
FROM "vacancies" AS vacancy
WHERE application."vacancyId" = vacancy."id";
ALTER TABLE "applications" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "compatibilityScore" DROP DEFAULT;

CREATE TABLE "application_status_history" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "fromStatus" "ApplicationStatus",
  "toStatus" "ApplicationStatus" NOT NULL,
  "changedById" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

INSERT INTO "application_status_history" ("id", "applicationId", "fromStatus", "toStatus", "changedById", "changedAt")
SELECT gen_random_uuid()::text, application."id", NULL, application."status", candidate."userId", application."createdAt"
FROM "applications" AS application
JOIN "candidate_profiles" AS candidate ON candidate."id" = application."candidateId";

CREATE INDEX "applications_companyId_status_idx" ON "applications"("companyId", "status");
CREATE INDEX "application_status_history_applicationId_changedAt_idx" ON "application_status_history"("applicationId", "changedAt");
ALTER TABLE "applications" ADD CONSTRAINT "applications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
