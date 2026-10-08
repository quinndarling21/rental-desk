import { useMemo, useSyncExternalStore } from 'react';
import type { Agreement, DamageReport, InventoryItem, ItemStatus, ReturnRecord } from '../types';
import { baseAgreements } from './agreements';
import { baseInventory, statusAfterReturn } from './inventory';

const STORAGE_KEY = 'rental-desk.session';

/**
 * Changes made at this counter on top of data/*.json. Agreements are stored
 * whole, keyed by RA number, and replace the original when merged.
 */
export interface SessionChanges {
  agreements: Record<string, Agreement>;
  damageReports: Record<string, DamageReport[]>;
  itemStatus: Record<string, ItemStatus>;
}

const noChanges: SessionChanges = { agreements: {}, damageReports: {}, itemStatus: {} };

function load(): SessionChanges {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...noChanges, ...(JSON.parse(saved) as Partial<SessionChanges>) } : noChanges;
  } catch {
    return noChanges;
  }
}

let changes = load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getChanges() {
  return changes;
}

function commit(next: SessionChanges) {
  changes = next;
  if (next === noChanges) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function resetSessionChanges() {
  commit(noChanges);
}

/** Saves an agreement after a check-out and marks the items just added as Out. */
export function saveCheckOut(agreement: Agreement, assetTags: string[]) {
  const itemStatus = { ...changes.itemStatus };
  for (const tag of assetTags) itemStatus[tag] = 'Out';
  commit({ ...changes, agreements: { ...changes.agreements, [agreement.raNumber]: agreement }, itemStatus });
}

/** Saves a completed return: the updated agreement, any damage reports, and where each item went. */
export function saveReturn(agreement: Agreement, record: ReturnRecord, reports: DamageReport[]) {
  const itemStatus = { ...changes.itemStatus };
  for (const line of record.lines) itemStatus[line.assetTag] = statusAfterReturn(line.condition);

  const existingReports = changes.damageReports[agreement.raNumber] ?? [];
  commit({
    agreements: { ...changes.agreements, [agreement.raNumber]: agreement },
    damageReports: { ...changes.damageReports, [agreement.raNumber]: [...existingReports, ...reports] },
    itemStatus,
  });
}

export function useSessionChanges(): SessionChanges {
  return useSyncExternalStore(subscribe, getChanges);
}

export function mergeAgreements(base: Agreement[], changed: Record<string, Agreement>): Agreement[] {
  const baseNumbers = new Set(base.map((agreement) => agreement.raNumber));
  const created = Object.values(changed).filter((agreement) => !baseNumbers.has(agreement.raNumber));
  return [...base.map((agreement) => changed[agreement.raNumber] ?? agreement), ...created];
}

export function useAgreements(): Agreement[] {
  const { agreements } = useSessionChanges();
  return useMemo(() => mergeAgreements(baseAgreements, agreements), [agreements]);
}

export function useInventory(): InventoryItem[] {
  const { itemStatus } = useSessionChanges();
  return useMemo(
    () =>
      baseInventory.map((item) => {
        const status = itemStatus[item.assetTag];
        return status ? { ...item, status } : item;
      }),
    [itemStatus],
  );
}

const noReports: DamageReport[] = [];

export function useDamageReports(raNumber: string): DamageReport[] {
  return useSessionChanges().damageReports[raNumber] ?? noReports;
}
