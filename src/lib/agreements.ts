import agreementsData from '../../data/agreements.json';
import type { Agreement, AgreementLine, AgreementStatus, Condition, Contact, Location, ReturnRecord } from '../types';

export const baseAgreements = agreementsData as Agreement[];

export const AGREEMENT_STATUSES: AgreementStatus[] = ['Out', 'Due today', 'Overdue', 'Returned'];

export function isAgreementStatus(value: unknown): value is AgreementStatus {
  return AGREEMENT_STATUSES.includes(value as AgreementStatus);
}

export function itemsOut(agreement: Agreement): AgreementLine[] {
  return agreement.lines.filter((line) => !line.returned);
}

export function countItems(count: number): string {
  return count === 1 ? '1 item' : `${count} items`;
}

export function agreementStatus(agreement: Agreement, today: string): AgreementStatus {
  if (itemsOut(agreement).length === 0) return 'Returned';
  if (agreement.dueBack < today) return 'Overdue';
  if (agreement.dueBack === today) return 'Due today';
  return 'Out';
}

export interface AgreementFilters {
  location: Location | 'All';
  status: AgreementStatus | 'All';
  search: string;
}

export function filterAgreements(agreements: Agreement[], filters: AgreementFilters, today: string): Agreement[] {
  const search = filters.search.trim().toLowerCase();
  return agreements.filter(
    (agreement) =>
      (filters.location === 'All' || agreement.location === filters.location) &&
      (filters.status === 'All' || agreementStatus(agreement, today) === filters.status) &&
      (!search ||
        agreement.raNumber.toLowerCase().includes(search) ||
        agreement.production.toLowerCase().includes(search)),
  );
}

const COUNTER_ORDER: Record<AgreementStatus, number> = { Overdue: 0, 'Due today': 1, Out: 2, Returned: 3 };

/** Overdue first, then due today, then by due back date, so the counter sees what to chase. */
export function sortForCounter(agreements: Agreement[], today: string): Agreement[] {
  return [...agreements].sort(
    (a, b) =>
      COUNTER_ORDER[agreementStatus(a, today)] - COUNTER_ORDER[agreementStatus(b, today)] ||
      a.dueBack.localeCompare(b.dueBack) ||
      a.raNumber.localeCompare(b.raNumber),
  );
}

export function nextRaNumber(agreements: Agreement[]): string {
  const highest = Math.max(...agreements.map((agreement) => Number(agreement.raNumber.replace('RA-', ''))));
  return `RA-${highest + 1}`;
}

export interface NewAgreementDetails {
  production: string;
  productionDetail: string;
  contact: Contact;
  location: Location;
  dueBack: string;
}

export function openAgreement(
  details: NewAgreementDetails,
  raNumber: string,
  staffInitials: string,
  today: string,
): Agreement {
  return { ...details, raNumber, checkedOutBy: staffInitials, checkedOutOn: today, lines: [] };
}

export interface CheckOutItem {
  assetTag: string;
  condition: Condition;
  /** Set when photo check-in is on, including "" when no wear was noted. */
  note?: string;
}

export function addCheckOutLines(
  agreement: Agreement,
  items: CheckOutItem[],
  staffInitials: string,
  today: string,
): Agreement {
  const lines: AgreementLine[] = items.map((item) => ({
    assetTag: item.assetTag,
    checkedOutOn: today,
    checkedOutBy: staffInitials,
    conditionOut: item.condition,
    ...(item.note !== undefined ? { conditionOutNote: item.note.trim() } : {}),
    returned: false,
  }));
  return { ...agreement, lines: [...agreement.lines, ...lines] };
}

/** Closes the open line for each returned asset tag. An item is only ever on one open line. */
export function applyReturn(agreement: Agreement, record: ReturnRecord): Agreement {
  const returnedByTag = new Map(record.lines.map((returned) => [returned.assetTag, returned]));
  const lines = agreement.lines.map((line) => {
    const returned = line.returned ? undefined : returnedByTag.get(line.assetTag);
    if (!returned) return line;
    return {
      ...line,
      returned: true,
      returnedOn: record.returnedOn,
      returnedBy: record.receivedBy,
      returnCondition: returned.condition,
      returnNotes: returned.notes,
    };
  });
  return { ...agreement, lines };
}
