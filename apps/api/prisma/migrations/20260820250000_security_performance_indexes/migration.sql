CREATE INDEX "skills_active_type_category_idx" ON "skills"("active", "type", "category");
CREATE INDEX "vacancies_status_adminHidden_publishedAt_idx" ON "vacancies"("status", "adminHidden", "publishedAt");
CREATE INDEX "applications_candidateId_createdAt_idx" ON "applications"("candidateId", "createdAt");
CREATE INDEX "applications_vacancyId_compatibilityScore_idx" ON "applications"("vacancyId", "compatibilityScore");
CREATE INDEX "applications_companyId_createdAt_idx" ON "applications"("companyId", "createdAt");
