import type { Condition } from '../types';

const CONDITIONS: Condition[] = ['OK', 'Needs service', 'Damaged'];

interface ConditionSelectProps {
  /** Accessible name; rows in a table have no visible label of their own. */
  label: string;
  value: Condition | '';
  onChange: (condition: Condition | '') => void;
  disabled?: boolean;
  /** When set, the counter must choose a condition. Mark all returned does not choose one. */
  emptyLabel?: string;
}

function isCondition(value: string): value is Condition {
  return CONDITIONS.includes(value as Condition);
}

export function ConditionSelect({ label, value, onChange, disabled = false, emptyLabel }: ConditionSelectProps) {
  return (
    <select
      className="select select--condition"
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const next = event.target.value;
        if (next === '' || isCondition(next)) onChange(next);
      }}
    >
      {emptyLabel && <option value="">{emptyLabel}</option>}
      {CONDITIONS.map((condition) => (
        <option key={condition}>{condition}</option>
      ))}
    </select>
  );
}
