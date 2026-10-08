import type { Location } from '../types';

export const LOCATIONS: Location[] = ['Burbank', 'Atlanta', 'Albuquerque'];

export function isLocation(value: unknown): value is Location {
  return LOCATIONS.includes(value as Location);
}
