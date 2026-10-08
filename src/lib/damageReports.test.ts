import { describe, expect, it } from 'vitest';
import type { Agreement, ReturnRecord } from '../types';
import { counterLeadFor, createDamageReports } from './damageReports';
import { staff } from './staff';

function agreementAt(location: Agreement['location']): Agreement {
  return {
    raNumber: 'RA-24141',
    production: 'Night Ferry',
    productionDetail: 'Season 2',
    contact: { name: 'Dana Whitlock', phone: '(818) 555-0142' },
    location,
    checkedOutBy: 'OF',
    checkedOutOn: '2026-09-28',
    dueBack: '2026-10-06',
    lines: [],
  };
}

const record: ReturnRecord = {
  raNumber: 'RA-24141',
  returnedOn: '2026-10-08',
  receivedBy: 'OF',
  lines: [
    { assetTag: 'BUR-LT-0142', condition: 'OK', notes: '' },
    { assetTag: 'BUR-LT-0157', condition: 'Damaged', notes: 'Lens cracked, head was dropped.' },
    { assetTag: 'BUR-GR-0203', condition: 'Needs service', notes: 'Knuckle slipping.' },
  ],
};

describe('counterLeadFor', () => {
  it('finds the counter lead for each location', () => {
    expect(counterLeadFor(staff, 'Burbank').name).toBe('Luis Ibarra');
    expect(counterLeadFor(staff, 'Atlanta').name).toBe('Tasha Greene');
    expect(counterLeadFor(staff, 'Albuquerque').name).toBe('Ray Delgado');
  });

  it('throws when a location has no lead on file', () => {
    const noLead = staff.filter((member) => member.role !== 'Counter lead');
    expect(() => counterLeadFor(noLead, 'Atlanta')).toThrow('No counter lead on file for Atlanta');
  });
});

describe('createDamageReports', () => {
  it('reports every item returned Damaged or Needs service and skips OK items', () => {
    const reports = createDamageReports(agreementAt('Burbank'), record, staff);

    expect(reports.map((report) => [report.assetTag, report.condition])).toEqual([
      ['BUR-LT-0157', 'Damaged'],
      ['BUR-GR-0203', 'Needs service'],
    ]);
    expect(reports[0]).toMatchObject({
      raNumber: 'RA-24141',
      notes: 'Lens cracked, head was dropped.',
      location: 'Burbank',
      reportedBy: 'OF',
      reportedOn: '2026-10-08',
      routedTo: 'Luis Ibarra',
    });
  });

  it('routes to the lead where the agreement is held', () => {
    const reports = createDamageReports(agreementAt('Atlanta'), record, staff);
    expect(reports.every((report) => report.routedTo === 'Tasha Greene')).toBe(true);
  });

  it('creates nothing when everything comes back OK', () => {
    const allOk = { ...record, lines: [{ assetTag: 'BUR-LT-0142', condition: 'OK' as const, notes: '' }] };
    expect(createDamageReports(agreementAt('Burbank'), allOk, staff)).toEqual([]);
  });
});
