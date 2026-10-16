import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { evidenceHash, submissionEvidence } from '../src/experiences/certificate-evidence';
import { ExperiencesService } from '../src/experiences/experiences.service';
import type { PrismaService } from '../src/prisma/prisma.service';

void describe('evidencia de certificados', () => {
  void it('mantiene la huella al reordenar claves JSONB pero detecta contenido distinto', () => {
    const original = { candidate: 'Ana', evaluation: { quality: 2, compliance: 5 } };
    assert.equal(
      evidenceHash(original),
      evidenceHash({ evaluation: { compliance: 5, quality: 2 }, candidate: 'Ana' }),
    );
    assert.notEqual(
      evidenceHash(original),
      evidenceHash({ ...original, candidate: 'Otra persona' }),
    );
    assert.notEqual(
      evidenceHash(original),
      evidenceHash({ ...original, evaluation: { quality: 5, compliance: 5 } }),
    );
  });
  void it('vincula la evaluación a la revisión y contenido de la entrega', () => {
    const submission = {
      id: 's1',
      workDescription: 'Trabajo',
      projectUrl: 'https://example.test/1',
      githubUrl: null,
      additionalLinks: [],
      comments: null,
      updatedAt: new Date('2026-10-01'),
    };
    const hash = evidenceHash(submissionEvidence(submission));
    assert.notEqual(
      hash,
      evidenceHash(submissionEvidence({ ...submission, projectUrl: 'https://example.test/2' })),
    );
    assert.notEqual(
      hash,
      evidenceHash(submissionEvidence({ ...submission, updatedAt: new Date('2026-10-02') })),
    );
  });
  const code = 'CNK-EXP-1234567890ABCDEF';
  const snapshot = { version: 1, candidate: 'Ana', evaluation: { quality: 2 } };
  const certificate = {
    code,
    status: 'ACTIVE',
    issuedAt: new Date(),
    revokedAt: null,
    snapshot,
    payloadHash: evidenceHash(snapshot),
    verifiedExperience: { public: true },
  };
  const service = (value: unknown) =>
    new ExperiencesService({
      experienceCertificate: { findUnique: async () => value },
    } as unknown as PrismaService);
  void it('no presenta contenido alterado como verificado', async () => {
    const result = await service({
      ...certificate,
      snapshot: { ...snapshot, candidate: 'Otra persona' },
    }).verify(code);
    assert.equal(result.verification, 'INVALID');
    assert.equal('snapshot' in result, false);
  });
  void it('identifica certificados anteriores sin inventar evidencia', async () => {
    const result = await service({ ...certificate, snapshot: null, payloadHash: null }).verify(
      code,
    );
    assert.equal(result.verification, 'LEGACY');
  });
  void it('respeta visibilidad y no revela datos de certificados ocultos', async () => {
    await assert.rejects(
      service({ ...certificate, verifiedExperience: { public: false } }).verify(code),
      NotFoundException,
    );
    await assert.rejects(service(certificate).verify('codigo-invalido'), NotFoundException);
  });
});
