import type {
  BenchFinding,
  Condition,
  ConditionAcknowledgment,
  ConditionRecord,
  ShareLink,
} from '../types';

export function buildConditionRecord(input: {
  raNumber: string;
  assetTag: string;
  lineKey: string;
  stage: 'check-out' | 'return';
  condition: Condition;
  note: string;
  photoIds: string[];
  recordedAt: string;
  recordedBy: string;
  acknowledgment: ConditionAcknowledgment;
}): ConditionRecord {
  return { id: crypto.randomUUID(), ...input, note: input.note.trim() };
}

export function buildBenchFinding(input: {
  raNumber: string;
  assetTag: string;
  lineKey: string;
  note: string;
  photoIds: string[];
  loggedAt: string;
  loggedBy: string;
}): BenchFinding {
  return { id: crypto.randomUUID(), ...input, note: input.note.trim() };
}

/** Placeholder share: the link does not expire and is not emailed. */
export function buildShareLink(input: {
  raNumber: string;
  assetTag: string;
  lineKey: string;
  itemName: string;
  production: string;
  createdAt: string;
}): ShareLink {
  return { token: crypto.randomUUID(), expiresAt: null, ...input };
}

export function shareUrl(token: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/share/${token}`;
}
