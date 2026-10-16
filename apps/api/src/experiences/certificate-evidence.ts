import { createHash } from 'node:crypto';

// Sorted object keys make this digest independent of PostgreSQL JSONB key order.
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(',')}}`;
}

export function evidenceHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function submissionEvidence(submission: {
  id: string;
  workDescription: string;
  projectUrl: string;
  githubUrl: string | null;
  additionalLinks: string[];
  comments: string | null;
  updatedAt: Date;
}) {
  return {
    id: submission.id,
    workDescription: submission.workDescription,
    projectUrl: submission.projectUrl,
    githubUrl: submission.githubUrl,
    additionalLinks: submission.additionalLinks,
    comments: submission.comments,
    updatedAt: submission.updatedAt.toISOString(),
  };
}

export const activeCertificateWhere = {
  certificate: {
    is: {
      status: 'ACTIVE' as const,
      payloadHash: { not: null },
    },
  },
};
