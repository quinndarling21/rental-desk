import staffData from '../../data/staff.json';
import type { Location, StaffMember } from '../types';

export const staff = staffData as StaffMember[];

export function staffAt(members: StaffMember[], location: Location): StaffMember[] {
  return members.filter((member) => member.location === location);
}

export function findStaffByInitials(members: StaffMember[], initials: string): StaffMember | undefined {
  const normalized = initials.trim().toUpperCase();
  return members.find((member) => member.initials === normalized);
}

/** Message for a sign-off initials field, or null when the initials belong to counter staff. */
export function initialsProblem(members: StaffMember[], initials: string): string | null {
  if (!initials.trim()) return 'Enter your initials.';
  if (!findStaffByInitials(members, initials)) {
    return `No counter staff with initials ${initials.trim().toUpperCase()}.`;
  }
  return null;
}
