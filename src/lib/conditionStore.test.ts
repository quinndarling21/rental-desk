import { describe, expect, it } from 'vitest';
import { buildBenchFinding } from './conditionRecords';
import { createMemoryConditionStore, type NewPhoto } from './conditionStore';
import { captureStamp } from './photoCheckIn';
import { staff } from './staff';

function staffByInitials(initials: string) {
  const member = staff.find((person) => person.initials === initials);
  if (!member) throw new Error(`Expected ${initials} on the staff list`);
  return member;
}

const omar = staffByInitials('OF');

function photo(id: string, stampName = 'Omar Farouk'): NewPhoto {
  return {
    id,
    raNumber: 'RA-24141',
    assetTag: 'BUR-LT-0142',
    lineKey: 'RA-24141:BUR-LT-0142:2026-09-28',
    stage: 'check-out',
    stamp: { ...captureStamp(omar, '2026-10-08T15:04:00.000Z'), staffName: stampName },
    blob: new Blob(['photo']),
  };
}

describe('condition store', () => {
  it('refuses to overwrite a photo, so the stamp cannot be edited', async () => {
    const store = createMemoryConditionStore();
    await store.savePhoto(photo('photo-1'));

    await expect(store.savePhoto(photo('photo-1', 'Edited Name'))).rejects.toThrow(
      'Photo stamp for photo-1 cannot be edited.',
    );

    const loaded = await store.loadLine('RA-24141:BUR-LT-0142:2026-09-28');
    expect(loaded.photos[0].stamp.staffName).toBe('Omar Farouk');
    expect(loaded.photos[0].stamp.takenAt).toBe('2026-10-08T15:04:00.000Z');
  });

  it('accepts a retry of a photo already stored by a partial save', async () => {
    const store = createMemoryConditionStore();
    const original = photo('photo-1');

    await store.savePhoto(original);
    await store.savePhoto(original);

    const loaded = await store.loadLine(original.lineKey);
    expect(loaded.photos).toHaveLength(1);
    expect(loaded.photos[0].stamp.staffName).toBe('Omar Farouk');
  });

  it('keeps a bench finding on the line it was logged against', async () => {
    const store = createMemoryConditionStore();
    const finding = buildBenchFinding({
      raNumber: 'RA-24141',
      assetTag: 'BUR-LT-0142',
      lineKey: 'RA-24141:BUR-LT-0142:2026-09-28',
      note: 'Yoke cracked after it came back.',
      photoIds: ['bench-1'],
      loggedAt: '2026-10-08T18:12:00.000Z',
      loggedBy: 'LI',
    });
    await store.savePhoto({
      ...photo('bench-1'),
      stage: 'bench',
      findingId: finding.id,
    });
    await store.saveBenchFinding(finding);

    const line = await store.loadLine(finding.lineKey);
    const other = await store.loadLine('RA-24144:ATL-LT-0221:2026-09-30');

    expect(line.findings).toEqual([finding]);
    expect(line.photos.map((item) => item.id)).toEqual(['bench-1']);
    expect(other.findings).toEqual([]);
    expect(other.photos).toEqual([]);
  });
});
