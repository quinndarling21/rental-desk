import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '../types';
import { availableAt, baseInventory, checkOutProblem, findItem, statusAfterReturn } from './inventory';

const items: InventoryItem[] = [
  {
    assetTag: 'BUR-LT-0142',
    barcode: '1100142',
    name: '2K LED fresnel',
    category: 'Lighting',
    location: 'Burbank',
    dailyRate: 85,
    status: 'Available',
  },
  {
    assetTag: 'BUR-GR-0203',
    barcode: '1200203',
    name: 'C-stand 40 in.',
    category: 'Grip',
    location: 'Burbank',
    dailyRate: 12,
    status: 'Out',
  },
  {
    assetTag: 'BUR-CT-0009',
    barcode: '1400009',
    name: 'Cine lens case',
    category: 'Carts & cases',
    location: 'Burbank',
    dailyRate: 55,
    status: 'Service bench',
  },
  {
    assetTag: 'ATL-GR-0310',
    barcode: '2200310',
    name: '12x12 silk',
    category: 'Grip',
    location: 'Atlanta',
    dailyRate: 45,
    status: 'Available',
  },
];

describe('findItem', () => {
  it('matches an asset tag regardless of case and spacing', () => {
    expect(findItem(items, '  bur-lt-0142 ')?.name).toBe('2K LED fresnel');
  });

  it('matches the barcode digits from a scanner', () => {
    expect(findItem(items, '2200310')?.assetTag).toBe('ATL-GR-0310');
  });

  it('returns undefined for unknown or empty codes', () => {
    expect(findItem(items, 'BUR-LT-9999')).toBeUndefined();
    expect(findItem(items, '   ')).toBeUndefined();
  });
});

describe('availableAt', () => {
  it('lists only available items at the given location', () => {
    expect(availableAt(items, 'Burbank').map((item) => item.assetTag)).toEqual(['BUR-LT-0142']);
    expect(availableAt(items, 'Albuquerque')).toEqual([]);
  });
});

describe('checkOutProblem', () => {
  it('allows an available item at the agreement location', () => {
    expect(checkOutProblem(items[0], 'Burbank')).toBeNull();
  });

  it('blocks items from another location', () => {
    expect(checkOutProblem(items[3], 'Burbank')).toBe('ATL-GR-0310 belongs to Atlanta. This agreement is at Burbank.');
  });

  it('blocks items that are out or on the service bench', () => {
    expect(checkOutProblem(items[1], 'Burbank')).toBe('BUR-GR-0203 is already checked out.');
    expect(checkOutProblem(items[2], 'Burbank')).toBe('BUR-CT-0009 is on the service bench.');
  });
});

describe('statusAfterReturn', () => {
  it('sends anything not OK to the service bench', () => {
    expect(statusAfterReturn('OK')).toBe('Available');
    expect(statusAfterReturn('Needs service')).toBe('Service bench');
    expect(statusAfterReturn('Damaged')).toBe('Service bench');
  });
});

describe('inventory data', () => {
  it('has unique asset tags and barcodes', () => {
    const tags = new Set(baseInventory.map((item) => item.assetTag));
    const barcodes = new Set(baseInventory.map((item) => item.barcode));
    expect(tags.size).toBe(baseInventory.length);
    expect(barcodes.size).toBe(baseInventory.length);
  });

  it('uses the location prefix in every asset tag', () => {
    const prefixes = { Burbank: 'BUR-', Atlanta: 'ATL-', Albuquerque: 'ABQ-' };
    for (const item of baseInventory) {
      expect(item.assetTag.startsWith(prefixes[item.location])).toBe(true);
    }
  });
});
