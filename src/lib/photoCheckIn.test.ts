import { describe, expect, it } from 'vitest';
import { buildBenchFinding } from './conditionRecords';
import {
  acknowledgmentProblem,
  benchFindingProblems,
  canShareConditionPhotos,
  captureStamp,
  checkOutNoteLabel,
  checkOutPhotoProblems,
  editPhotoStamp,
  lineKey,
  markReturned,
  photoCheckInActive,
  returnPhotoProblems,
} from './photoCheckIn';
import { staff } from './staff';

function staffByInitials(initials: string) {
  const member = staff.find((person) => person.initials === initials);
  if (!member) throw new Error(`Expected ${initials} on the staff list`);
  return member;
}

const omar = staffByInitials('OF');

describe('photoCheckInActive', () => {
  it('turns the feature on for Burbank only, and only while the pilot switch is on', () => {
    expect(photoCheckInActive('Burbank', true)).toBe(true);
    expect(photoCheckInActive('Burbank', false)).toBe(false);
    expect(photoCheckInActive('Atlanta', true)).toBe(false);
    expect(photoCheckInActive('Albuquerque', true)).toBe(false);
  });
});

describe('check-out photos', () => {
  it('blocks check-out when any line is missing a photo', () => {
    const items = [
      { assetTag: 'BUR-LT-0171', photoCount: 1 },
      { assetTag: 'BUR-PW-0090', photoCount: 0 },
    ];
    expect(checkOutPhotoProblems(items, true)).toEqual(['Add a check-out photo for BUR-PW-0090.']);
  });

  it('does not require photos when the pilot is off for this counter', () => {
    expect(checkOutPhotoProblems([{ assetTag: 'ATL-LT-0230', photoCount: 0 }], false)).toEqual([]);
  });
});

describe('return photos and condition', () => {
  it('blocks a returned line that has no condition or photo', () => {
    expect(
      returnPhotoProblems(
        [{ assetTag: 'BUR-LT-0166', returned: true, condition: '', notes: '', photoCount: 0 }],
        null,
        true,
      ),
    ).toEqual(['Set a return condition for BUR-LT-0166.', 'Add a return photo for BUR-LT-0166.']);
  });

  it('still requires a photo after the condition is set', () => {
    expect(
      returnPhotoProblems(
        [{ assetTag: 'BUR-LT-0166', returned: true, condition: 'OK', notes: '', photoCount: 0 }],
        null,
        true,
      ),
    ).toEqual(['Add a return photo for BUR-LT-0166.']);
  });

  it('does not let mark all returned fill in a condition or a photo', () => {
    const open = [
      { assetTag: 'BUR-LT-0166', returned: false, condition: '' as const, notes: '', photoCount: 0 },
      { assetTag: 'BUR-GR-0225', returned: false, condition: '' as const, notes: '', photoCount: 0 },
    ];
    const marked = markReturned(open);

    expect(marked.every((line) => line.returned)).toBe(true);
    expect(marked.every((line) => line.condition === '' && line.photoCount === 0)).toBe(true);
    expect(returnPhotoProblems(marked, null, true)).toEqual([
      'Set a return condition for BUR-LT-0166.',
      'Add a return photo for BUR-LT-0166.',
      'Set a return condition for BUR-GR-0225.',
      'Add a return photo for BUR-GR-0225.',
    ]);
  });

  it('keeps the existing note rule for damaged gear when photo check-in is off', () => {
    expect(
      returnPhotoProblems(
        [{ assetTag: 'BUR-LT-0157', returned: true, condition: 'Damaged', notes: '', photoCount: 0 }],
        'Enter your initials.',
        false,
      ),
    ).toEqual([
      'Add a note for BUR-LT-0157: Damaged and Needs service returns need a description.',
      'Enter your initials.',
    ]);
  });
});

describe('photo stamps', () => {
  it('stamps the date, time, and staff member and refuses a later edit', () => {
    const stamp = captureStamp(omar, '2026-10-08T15:04:00.000Z');

    expect(stamp).toMatchObject({
      takenAt: '2026-10-08T15:04:00.000Z',
      staffId: 'omar-farouk',
      staffName: 'Omar Farouk',
      staffInitials: 'OF',
    });
    expect(stamp.takenAt).toContain('T');
    expect(() => editPhotoStamp('photo-1')).toThrow('Photo stamp for photo-1 cannot be edited.');
  });
});

describe('condition notes and acknowledgment', () => {
  it('tells the return counter when a check-out note was saved', () => {
    expect(checkOutNoteLabel(undefined)).toBe('No check-out note on file.');
    expect(checkOutNoteLabel('')).toBe('No wear noted at check-out.');
    expect(checkOutNoteLabel('Yoke scuffed')).toBe('Yoke scuffed');
  });

  it('requires the placeholder acknowledgment only while photo check-in is on', () => {
    expect(acknowledgmentProblem('', false, true)).toMatch(/placeholder/i);
    expect(acknowledgmentProblem('Sample Runner', true, true)).toBeNull();
    expect(acknowledgmentProblem('', false, false)).toBeNull();
  });
});

describe('bench findings', () => {
  it('attaches the finding to the returned agreement line', () => {
    const key = lineKey('RA-24141', 'BUR-LT-0142', '2026-09-28');
    const finding = buildBenchFinding({
      raNumber: 'RA-24141',
      assetTag: 'BUR-LT-0142',
      lineKey: key,
      note: 'Yoke cracked after it came back.',
      photoIds: ['bench-photo-1'],
      loggedAt: '2026-10-08T18:12:00.000Z',
      loggedBy: 'LI',
    });

    expect(finding.raNumber).toBe('RA-24141');
    expect(finding.assetTag).toBe('BUR-LT-0142');
    expect(finding.lineKey).toBe('RA-24141:BUR-LT-0142:2026-09-28');
    expect(finding.photoIds).toEqual(['bench-photo-1']);
    expect(finding.note).toBe('Yoke cracked after it came back.');
  });

  it('needs a note and at least one photo', () => {
    expect(benchFindingProblems('  ', 0)).toEqual([
      'Add a note describing what the bench found.',
      'Add at least one bench photo.',
    ]);
    expect(benchFindingProblems('Cracked yoke.', 1)).toEqual([]);
  });
});

describe('canShareConditionPhotos', () => {
  it('lets a counter lead share the line and keeps counter staff from doing it', () => {
    expect(canShareConditionPhotos('Counter lead')).toBe(true);
    expect(canShareConditionPhotos('Counter staff')).toBe(false);
  });
});
