import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { MatchingService } from '../src/matching/matching.service';
import { ApplicationsService } from '../src/applications/applications.service';

const matching = {
  vacancyMatch: async () => ({
    score: 82,
    strengths: [],
    missingSkills: [],
    breakdown: { skills: 40, education: 20, projects: 10, softSkills: 7, availability: 5 },
    recommendation: 'Aplicar',
  }),
};
function serviceWith(
  options: { vacancy?: { id: string; title: string; companyId: string; company: { userId: string } } | null; duplicate?: boolean } = {},
) {
  const application = {
    id: 'application',
    candidateId: 'candidate',
    vacancyId: 'vacancy',
    companyId: 'company',
    compatibilityScore: 82,
    status: ApplicationStatus.APPLIED,
    coverLetter: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const tx = {
    application: {
      create: async () => {
        if (options.duplicate)
          throw new Prisma.PrismaClientKnownRequestError('duplicate', {
            code: 'P2002',
            clientVersion: 'test',
          });
        return application;
      },
    },
    applicationStatusHistory: { create: async () => ({}) },
  };
  const prisma = {
    candidateProfile: { findUnique: async () => ({ id: 'candidate' }) },
    vacancy: {
      findFirst: async () =>
        options.vacancy === undefined ? { id: 'vacancy', title: 'Vacante', companyId: 'company', company: { userId: 'company-user' } } : options.vacancy,
    },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  };
  return new ApplicationsService(
    prisma as unknown as PrismaService,
    matching as unknown as MatchingService,
    { create: async () => ({}) } as never,
  );
}
void describe('ApplicationsService', () => {
  void it('guarda empresa y compatibilidad histórica al postularse', async () => {
    const result = await serviceWith().apply('user', 'vacancy');
    assert.equal(result.companyId, 'company');
    assert.equal(result.compatibilityScore, 82);
    assert.equal(result.status, ApplicationStatus.APPLIED);
  });
  void it('rechaza postulaciones duplicadas', async () => {
    await assert.rejects(
      serviceWith({ duplicate: true }).apply('user', 'vacancy'),
      ConflictException,
    );
  });
  void it('rechaza vacantes inexistentes', async () => {
    await assert.rejects(
      serviceWith({ vacancy: null }).apply('user', 'missing'),
      NotFoundException,
    );
  });
});
