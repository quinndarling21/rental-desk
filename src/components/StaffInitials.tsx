import { findStaffByInitials, staff } from '../lib/staff';

interface StaffInitialsProps {
  initials: string;
  withName?: boolean;
}

export function StaffInitials({ initials, withName = false }: StaffInitialsProps) {
  const member = findStaffByInitials(staff, initials);
  const name = member?.name ?? 'Unknown staff';

  return (
    <span className="staff">
      <abbr className="staff__initials" title={name}>
        {initials}
      </abbr>
      {withName && <span className="staff__name">{name}</span>}
    </span>
  );
}
