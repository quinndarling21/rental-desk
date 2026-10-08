import inventoryData from '../../data/inventory.json';
import type { Condition, InventoryItem, ItemStatus, Location } from '../types';

export const baseInventory = inventoryData as InventoryItem[];

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Looks an item up by its asset tag or by the barcode digits a scanner types in. */
export function findItem(items: InventoryItem[], code: string): InventoryItem | undefined {
  const normalized = normalizeCode(code);
  if (!normalized) return undefined;
  return items.find((item) => item.assetTag === normalized || item.barcode === normalized);
}

export function availableAt(items: InventoryItem[], location: Location): InventoryItem[] {
  return items.filter((item) => item.location === location && item.status === 'Available');
}

/** Why an item cannot go out on an agreement at `location`, or null when it can. */
export function checkOutProblem(item: InventoryItem, location: Location): string | null {
  if (item.location !== location) {
    return `${item.assetTag} belongs to ${item.location}. This agreement is at ${location}.`;
  }
  if (item.status === 'Out') return `${item.assetTag} is already checked out.`;
  if (item.status === 'Service bench') return `${item.assetTag} is on the service bench.`;
  return null;
}

export function statusAfterReturn(condition: Condition): ItemStatus {
  return condition === 'OK' ? 'Available' : 'Service bench';
}

export function formatDailyRate(rate: number): string {
  return `$${rate}/day`;
}
