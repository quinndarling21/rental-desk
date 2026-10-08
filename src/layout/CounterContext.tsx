import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isLocation } from '../lib/locations';
import { staff, staffAt } from '../lib/staff';
import type { Location, StaffMember } from '../types';

const STORAGE_KEY = 'rental-desk.counter';

interface CounterSelection {
  location: Location;
  staffId: string;
}

interface CounterContextValue {
  location: Location;
  signedIn: StaffMember;
  setLocation: (location: Location) => void;
  setSignedIn: (staffId: string) => void;
}

function firstStaffAt(location: Location): StaffMember {
  return staffAt(staff, location)[0];
}

function readSelection(): CounterSelection {
  const fallback = { location: 'Burbank' as const, staffId: firstStaffAt('Burbank').id };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object' && 'location' in saved && 'staffId' in saved) {
      const { location, staffId } = saved;
      if (isLocation(location) && typeof staffId === 'string') return { location, staffId };
    }
  } catch {
    // Unreadable selection: start from the default counter.
  }
  return fallback;
}

const CounterContext = createContext<CounterContextValue | null>(null);

export function CounterProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState(readSelection);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  }, [selection]);

  const signedIn =
    staff.find((member) => member.id === selection.staffId && member.location === selection.location) ??
    firstStaffAt(selection.location);

  const value: CounterContextValue = {
    location: selection.location,
    signedIn,
    setLocation: (location) => setSelection({ location, staffId: firstStaffAt(location).id }),
    setSignedIn: (staffId) => setSelection((current) => ({ ...current, staffId })),
  };

  return <CounterContext.Provider value={value}>{children}</CounterContext.Provider>;
}

export function useCounter(): CounterContextValue {
  const value = useContext(CounterContext);
  if (!value) throw new Error('useCounter must be used inside CounterProvider');
  return value;
}
