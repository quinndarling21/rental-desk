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
