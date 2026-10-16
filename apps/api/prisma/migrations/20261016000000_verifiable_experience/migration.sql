ALTER TABLE "experience_evaluations"
ADD COLUMN "evaluatedById" TEXT,
ADD COLUMN "evaluatedAt" TIMESTAMP(3),
ADD COLUMN "submissionHash" TEXT;

ALTER TABLE "experience_certificates"
ADD COLUMN "snapshot" JSONB,
ADD COLUMN "payloadHash" TEXT;

ALTER TABLE "verified_experiences" ALTER COLUMN "public" SET DEFAULT false;

-- Published evidence cannot be rewritten through normal database updates.
-- Legacy certificates remain without a snapshot; no historical evidence is invented.
CREATE FUNCTION protect_experience_certificate_payload() RETURNS trigger AS $$
BEGIN
  IF NEW."snapshot" IS DISTINCT FROM OLD."snapshot"
    OR NEW."payloadHash" IS DISTINCT FROM OLD."payloadHash"
    OR NEW."code" IS DISTINCT FROM OLD."code"
    OR NEW."issuedAt" IS DISTINCT FROM OLD."issuedAt"
    OR NEW."verifiedExperienceId" IS DISTINCT FROM OLD."verifiedExperienceId" THEN
    RAISE EXCEPTION 'Issued certificate evidence is immutable';
  END IF;
  IF OLD."status" = 'REVOKED' AND NEW."status" <> 'REVOKED' THEN
    RAISE EXCEPTION 'A revoked certificate cannot be reactivated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER experience_certificate_payload_immutable
BEFORE UPDATE ON "experience_certificates"
FOR EACH ROW EXECUTE FUNCTION protect_experience_certificate_payload();
