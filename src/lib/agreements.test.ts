import { describe, expect, it } from 'vitest';
import type { Agreement, AgreementLine } from '../types';
import {
  addCheckOutLines,
  agreementStatus,
  applyReturn,
  baseAgreements,
  filterAgreements,
  itemsOut,
  nextRaNumber,
  sortForCounter,
} from './agreements';
import { baseInventory, findItem } from './inventory';

const TODAY = '2026-10-08';

function line(assetTag: string, returned = false): AgreementLine {
  return { assetTag, checkedOutOn: '2026-10-01', checkedOutBy: 'OF', conditionOut: 'OK', returned };
}

function agreement(overrides: Partial<Agreement>): Agreement {
  return {
    raNumber: 'RA-24141',
    production: 'Night Ferry',
    productionDetail: 'Season 2',
    contact: { name: 'Dana Whitlock', phone: '(818) 555-0142' },
    location: 'Burbank',
    checkedOutBy: 'OF',
    checkedOutOn: '2026-10-01',
    dueBack: '2026-10-10',
    lines: [line('BUR-LT-0142'), line('BUR-GR-0203')],
    ...overrides,
  };
}

describe('agreementStatus', () => {
  it('is Out while items are out and the due date is ahead', () => {
    expect(agreementStatus(agreement({ dueBack: '2026-10-09' }), TODAY)).toBe('Out');
  });

  it('is Due today on the due back date', () => {
    expect(agreementStatus(agreement({ dueBack: TODAY }), TODAY)).toBe('Due today');
  });

  it('is Overdue after the due back date', () => {
    expect(agreementStatus(agreement({ dueBack: '2026-10-07' }), TODAY)).toBe('Overdue');
  });

  it('is Returned once every line is back, even past the due date', () => {
    const allBack = agreement({ dueBack: '2026-10-01', lines: [line('BUR-LT-0142', true)] });
    expect(agreementStatus(allBack, TODAY)).toBe('Returned');
  });
});

describe('itemsOut', () => {
  it('counts only lines not yet returned', () => {
    const partly = agreement({ lines: [line('BUR-LT-0142', true), line('BUR-GR-0203')] });
    expect(itemsOut(partly).map((l) => l.assetTag)).toEqual(['BUR-GR-0203']);
  });
});

describe('filterAgreements', () => {
  const list = [
    agreement({ raNumber: 'RA-24141', production: 'Night Ferry', location: 'Burbank', dueBack: '2026-10-06' }),
    agreement({ raNumber: 'RA-24144', production: 'Copper Ridge', location: 'Atlanta', dueBack: TODAY }),
    agreement({ raNumber: 'RA-24150', production: 'Mesa Line', location: 'Albuquerque', dueBack: '2026-10-10' }),
  ];
  const all = { location: 'All', status: 'All', search: '' } as const;

  it('filters by location', () => {
    const result = filterAgreements(list, { ...all, location: 'Atlanta' }, TODAY);
    expect(result.map((a) => a.raNumber)).toEqual(['RA-24144']);
  });

  it('filters by computed status', () => {
    const result = filterAgreements(list, { ...all, status: 'Overdue' }, TODAY);
    expect(result.map((a) => a.raNumber)).toEqual(['RA-24141']);
  });

  it('searches RA number digits and production name, ignoring case', () => {
    expect(filterAgreements(list, { ...all, search: '24150' }, TODAY).map((a) => a.production)).toEqual([
      'Mesa Line',
    ]);
    expect(filterAgreements(list, { ...all, search: ' copper ' }, TODAY).map((a) => a.raNumber)).toEqual([
      'RA-24144',
    ]);
  });
});

describe('sortForCounter', () => {
  it('puts overdue first, then due today, then the rest by due date', () => {
    const list = [
      agreement({ raNumber: 'RA-24150', dueBack: '2026-10-12' }),
      agreement({ raNumber: 'RA-24147', dueBack: '2026-10-09' }),
      agreement({ raNumber: 'RA-24144', dueBack: TODAY }),
      agreement({ raNumber: 'RA-24141', dueBack: '2026-10-06' }),
    ];
    expect(sortForCounter(list, TODAY).map((a) => a.raNumber)).toEqual([
      'RA-24141',
      'RA-24144',
      'RA-24147',
      'RA-24150',
    ]);
  });
});

describe('agreement data', () => {
  it('only lists items that exist at the agreement location', () => {
    for (const a of baseAgreements) {
      for (const l of a.lines) {
        expect(findItem(baseInventory, l.assetTag)?.location, `${a.raNumber} ${l.assetTag}`).toBe(a.location);
      }
    }
  });

  it('matches inventory: every item out is on exactly one open line', () => {
    const openTags = baseAgreements.flatMap((a) => itemsOut(a).map((l) => l.assetTag)).sort();
    const outTags = baseInventory
      .filter((item) => item.status === 'Out')
      .map((item) => item.assetTag)
      .sort();
    expect(openTags).toEqual(outTags);
  });
});

describe('nextRaNumber', () => {
  it('numbers a new agreement one past the highest RA', () => {
    const list = [agreement({ raNumber: 'RA-24150' }), agreement({ raNumber: 'RA-24156' })];
    expect(nextRaNumber(list)).toBe('RA-24157');
  });
});

describe('addCheckOutLines', () => {
  it('appends open lines stamped with the date, staff and condition', () => {
    const updated = addCheckOutLines(
      agreement({ lines: [line('BUR-LT-0142')] }),
      [{ assetTag: 'BUR-PW-0090', condition: 'Needs service' }],
      'OF',
      TODAY,
    );
    expect(updated.lines).toHaveLength(2);
    expect(updated.lines[1]).toEqual({
      assetTag: 'BUR-PW-0090',
      checkedOutOn: TODAY,
      checkedOutBy: 'OF',
      conditionOut: 'Needs service',
      returned: false,
    });
  });

  it('stores a check-out condition note when photo check-in records one', () => {
    const updated = addCheckOutLines(
      agreement({ lines: [] }),
      [{ assetTag: 'BUR-PW-0090', condition: 'OK', note: 'Yoke scuffed before it went out' }],
      'OF',
      TODAY,
    );
    expect(updated.lines[0].conditionOutNote).toBe('Yoke scuffed before it went out');
  });
});

describe('applyReturn', () => {
  it('closes only the returned lines with condition, notes, date and staff', () => {
    const updated = applyReturn(agreement({ lines: [line('BUR-LT-0142'), line('BUR-GR-0203')] }), {
      raNumber: 'RA-24141',
      returnedOn: TODAY,
      receivedBy: 'LI',
      lines: [{ assetTag: 'BUR-GR-0203', condition: 'Damaged', notes: 'Bent riser.' }],
    });

    expect(updated.lines[0].returned).toBe(false);
    expect(updated.lines[1]).toMatchObject({
      returned: true,
      returnedOn: TODAY,
      returnedBy: 'LI',
      returnCondition: 'Damaged',
      returnNotes: 'Bent riser.',
    });
  });

  it('leaves lines that were already returned alone', () => {
    const earlier = { ...line('BUR-LT-0142', true), returnedOn: '2026-10-03', returnCondition: 'OK' as const };
    const updated = applyReturn(agreement({ lines: [earlier] }), {
      raNumber: 'RA-24141',
      returnedOn: TODAY,
      receivedBy: 'LI',
      lines: [{ assetTag: 'BUR-LT-0142', condition: 'Damaged', notes: 'Cracked lens.' }],
    });
    expect(updated.lines[0]).toEqual(earlier);
  });
});
