ALTER TABLE "vacancies" ADD COLUMN "city" TEXT;
UPDATE "vacancies" SET "city" = COALESCE("location", 'Por definir');
ALTER TABLE "vacancies" ALTER COLUMN "city" SET NOT NULL;
