import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApplicationStatus } from '@prisma/client';
import { canCandidateWithdraw, canCompanyTransition } from '../src/applications/application-state';

void describe('reglas del proceso de postulación', () => {
  void it('permite el flujo empresarial progresivo y el rechazo', () => {
    assert.equal(canCompanyTransition(ApplicationStatus.APPLIED, ApplicationStatus.UNDER_REVIEW), true);
    assert.equal(canCompanyTransition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.INTERVIEW), true);
    assert.equal(canCompanyTransition(ApplicationStatus.INTERVIEW, ApplicationStatus.SELECTED), true);
    assert.equal(canCompanyTransition(ApplicationStatus.APPLIED, ApplicationStatus.REJECTED), true);
  });
  void it('impide saltos y cambios sobre estados finales', () => {
    assert.equal(canCompanyTransition(ApplicationStatus.APPLIED, ApplicationStatus.SELECTED), false);
    assert.equal(canCompanyTransition(ApplicationStatus.SELECTED, ApplicationStatus.REJECTED), false);
    assert.equal(canCompanyTransition(ApplicationStatus.WITHDRAWN, ApplicationStatus.UNDER_REVIEW), false);
  });
  void it('solo permite retirar procesos que siguen activos', () => {
    assert.equal(canCandidateWithdraw(ApplicationStatus.APPLIED), true);
    assert.equal(canCandidateWithdraw(ApplicationStatus.INTERVIEW), true);
    assert.equal(canCandidateWithdraw(ApplicationStatus.SELECTED), false);
    assert.equal(canCandidateWithdraw(ApplicationStatus.REJECTED), false);
  });
});
