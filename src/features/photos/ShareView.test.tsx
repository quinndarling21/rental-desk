import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildBenchFinding, buildConditionRecord, buildShareLink } from '../../lib/conditionRecords';
import { createMemoryConditionStore, setConditionStore, type NewPhoto } from '../../lib/conditionStore';
import { captureStamp } from '../../lib/photoCheckIn';
import { staff } from '../../lib/staff';
import { ShareView } from './ShareView';

function staffByInitials(initials: string) {
  const member = staff.find((person) => person.initials === initials);
  if (!member) throw new Error(`Expected ${initials} on the staff list`);
  return member;
}

const omar = staffByInitials('OF');

function photo(id: string, stage: NewPhoto['stage'], findingId?: string): NewPhoto {
  return {
    id,
    raNumber: 'RA-24153',
    assetTag: 'BUR-LT-0166',
    lineKey: 'RA-24153:BUR-LT-0166:2026-10-05',
    stage,
    stamp: captureStamp(omar, '2026-10-08T15:04:00.000Z'),
    blob: new Blob(['photo']),
    findingId,
  };
}

beforeEach(() => {
  setConditionStore(createMemoryConditionStore());
});

describe('ShareView', () => {
  it('shows check-out, return, and bench photos for one line and nothing else in Rental Desk', async () => {
    const store = createMemoryConditionStore();
    setConditionStore(store);
    const finding = buildBenchFinding({
      raNumber: 'RA-24153',
      assetTag: 'BUR-LT-0166',
      lineKey: 'RA-24153:BUR-LT-0166:2026-10-05',
      note: 'Yoke cracked on the bench.',
      photoIds: ['bench-1'],
      loggedAt: '2026-10-08T18:12:00.000Z',
      loggedBy: 'LI',
    });
    await store.savePhoto(photo('out-1', 'check-out'));
    await store.savePhoto(photo('return-1', 'return'));
    await store.savePhoto(photo('bench-1', 'bench', finding.id));
    await store.saveConditionRecord(
      buildConditionRecord({
        raNumber: 'RA-24153',
        assetTag: 'BUR-LT-0166',
        lineKey: finding.lineKey,
        stage: 'check-out',
        condition: 'OK',
        note: 'Small scuff on the yoke.',
        photoIds: ['out-1'],
        recordedAt: '2026-10-08T15:04:00.000Z',
        recordedBy: 'OF',
        acknowledgment: {
          customerName: 'Sample Runner',
          acknowledgedAt: '2026-10-08T15:05:00.000Z',
          method: 'tap-name-placeholder',
        },
      }),
    );
    await store.saveBenchFinding(finding);
    const link = buildShareLink({
      raNumber: 'RA-24153',
      assetTag: 'BUR-LT-0166',
      lineKey: finding.lineKey,
      itemName: 'LED panel 2x1',
      production: 'Blue Hour',
      createdAt: '2026-10-08T18:20:00.000Z',
    });
    await store.saveShare(link);

    render(
      <MemoryRouter initialEntries={[`/share/${link.token}`]}>
        <Routes>
          <Route path="/share/:token" element={<ShareView />} />
          <Route path="/agreements" element={<h1>Agreements</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'LED panel 2x1' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Check-out' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Return' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Bench' })).toBeDefined();
    expect(screen.getByText('Small scuff on the yoke.')).toBeDefined();
    expect(screen.getByText('Yoke cracked on the bench.')).toBeDefined();
    expect(screen.getByText(/does not expire/)).toBeDefined();
    expect(screen.getAllByText(/Omar Farouk/).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Check out' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Agreements' })).toBeNull();
  });
});
