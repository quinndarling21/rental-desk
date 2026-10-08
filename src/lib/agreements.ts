import agreementsData from '../../data/agreements.json';
import type { Agreement, AgreementLine, AgreementStatus, Location } from '../types';

export const baseAgreements = agreementsData as Agreement[];

export const AGREEMENT_STATUSES: AgreementStatus[] = ['Out', 'Due today', 'Overdue', 'Returned'];

export function isAgreementStatus(value: unknown): value is AgreementStatus {
  return AGREEMENT_STATUSES.includes(value as AgreementStatus);
}

export function itemsOut(agreement: Agreement): AgreementLine[] {
  return agreement.lines.filter((line) => !line.returned);
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
