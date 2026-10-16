import { ApplicationStatus } from '@prisma/client';

const COMPANY_TRANSITIONS: Readonly<Record<ApplicationStatus, readonly ApplicationStatus[]>> = {
  APPLIED: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED],
  UNDER_REVIEW: [ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED],
  INTERVIEW: [ApplicationStatus.SELECTED, ApplicationStatus.REJECTED],
  SELECTED: [ApplicationStatus.OFFER_SENT, ApplicationStatus.CANCELLED],
  OFFER_SENT: [ApplicationStatus.CANCELLED],
  OFFER_ACCEPTED: [ApplicationStatus.HIRED, ApplicationStatus.CANCELLED],
  OFFER_DECLINED: [], HIRED: [], CANCELLED: [], REJECTED: [], WITHDRAWN: [],
};

export function canCompanyTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return COMPANY_TRANSITIONS[from].includes(to);
}

export function canCandidateRespondToOffer(from: ApplicationStatus, to: ApplicationStatus): boolean {
  const responses: readonly ApplicationStatus[] = [ApplicationStatus.OFFER_ACCEPTED, ApplicationStatus.OFFER_DECLINED];
  return from === ApplicationStatus.OFFER_SENT && responses.includes(to);
}

export function canCandidateWithdraw(status: ApplicationStatus): boolean {
  const withdrawable: readonly ApplicationStatus[] = [ApplicationStatus.APPLIED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.INTERVIEW];
  return withdrawable.includes(status);
}
