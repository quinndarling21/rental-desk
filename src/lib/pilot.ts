import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'rental-desk.photo-checkin-pilot';

function readPilot(): boolean {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'off') return false;
    if (value === 'on') return true;
  } catch {
    // Private mode can block storage. Leave the pilot available for this page load.
  }
  return true;
}

let enabled = readPilot();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function photoCheckInPilotEnabled(): boolean {
  return enabled;
}

export function setPhotoCheckInPilot(next: boolean) {
  enabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
  } catch {
    // The in-memory switch still applies for this page load.
  }
  listeners.forEach((listener) => listener());
}

export function usePhotoCheckInPilot(): boolean {
  return useSyncExternalStore(subscribe, photoCheckInPilotEnabled);
}
