import type { AgreementStatus, Condition, ItemStatus } from '../types';

type Status = AgreementStatus | ItemStatus | Condition;
type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<Status, Tone> = {
  Out: 'info',
  'Due today': 'warning',
  Overdue: 'danger',
  Returned: 'success',
  Available: 'success',
  'Service bench': 'warning',
  OK: 'neutral',
  'Needs service': 'warning',
  Damaged: 'danger',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge--${TONES[status]}`}>{status}</span>;
}
