import type { Condition } from '../types';

const CONDITIONS: Condition[] = ['OK', 'Needs service', 'Damaged'];

interface ConditionSelectProps {
  /** Accessible name; rows in a table have no visible label of their own. */
  label: string;
  value: Condition;
  onChange: (condition: Condition) => void;
  disabled?: boolean;
}

export function ConditionSelect({ label, value, onChange, disabled = false }: ConditionSelectProps) {
  return (
    <select
      className="select select--condition"
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as Condition)}
    >
      {CONDITIONS.map((condition) => (
        <option key={condition}>{condition}</option>
      ))}
    </select>
  );
}
