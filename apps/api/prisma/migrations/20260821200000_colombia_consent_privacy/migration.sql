ALTER TABLE "users"
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT,
ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN "privacyVersion" TEXT,
ADD COLUMN "majorityAgeConfirmedAt" TIMESTAMP(3),
ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);

ALTER TABLE "candidate_profiles" ADD COLUMN "visibleToCompanies" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "company_profiles" ADD COLUMN "verificationRequestedAt" TIMESTAMP(3);

ALTER TABLE "vacancies"
ADD COLUMN "department" TEXT,
ADD COLUMN "workSchedule" "WorkSchedule" NOT NULL DEFAULT 'FULL_TIME',
ADD COLUMN "weeklyHours" INTEGER,
ADD COLUMN "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "requiresUniversityAgreement" BOOLEAN NOT NULL DEFAULT false;
