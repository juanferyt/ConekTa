import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service';
import { MatchingService } from '../src/matching/matching.service';

const candidate = {
  availableNow: true,
  modalities: ['REMOTO'],
  skills: [],
  educations: [],
  projects: [],
};
const vacancy = (id: string, modality = 'REMOTO') => ({
  id,
  title: id,
  description: 'Description',
  city: 'Bogota',
  modality,
  relatedCareers: [],
  skills: [],
  publishedAt: new Date(),
  company: {
    id: 'company',
    name: 'Company',
    logoUrl: null,
    city: 'Bogota',
    sector: null,
    verificationStatus: 'UNVERIFIED',
  },
  _count: { applications: 0 },
});
void describe('MatchingService', () => {
  void it('ordena vacantes publicadas por compatibilidad descendente', async () => {
    const prisma = {
      candidateProfile: { findUnique: async () => candidate },
      vacancy: { findMany: async () => [vacancy('low', 'PRESENCIAL'), vacancy('high')] },
    };
    const service = new MatchingService(prisma as unknown as PrismaService);
    const result = await service.recommendations('user');
    assert.equal(result[0].id, 'high');
    assert.equal(result[0].compatibility.score, 5);
    assert.equal(result[1].compatibility.score, 0);
  });
  void it('rechaza vacantes inexistentes u ocultas', async () => {
    const prisma = {
      candidateProfile: { findUnique: async () => candidate },
      vacancy: { findFirst: async () => null },
    };
    const service = new MatchingService(prisma as unknown as PrismaService);
    await assert.rejects(service.vacancyMatch('user', 'missing'), NotFoundException);
  });
});
