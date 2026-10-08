import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMemoryConditionStore, getConditionStore, setConditionStore } from '../../lib/conditionStore';
import { setPhotoCheckInPilot } from '../../lib/pilot';
import { resetSessionChanges } from '../../lib/store';
import { CounterProvider } from '../../layout/CounterContext';
import { AgreementDetail } from '../agreements/AgreementDetail';
import { ReturnCheckIn } from './ReturnCheckIn';

function renderReturn(raNumber: string) {
  render(
    <MemoryRouter initialEntries={[`/agreements/${raNumber}/return`]}>
      <CounterProvider>
        <Routes>
          <Route path="/agreements/:raNumber" element={<AgreementDetail />} />
          <Route path="/agreements/:raNumber/return" element={<ReturnCheckIn />} />
        </Routes>
      </CounterProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  localStorage.clear();
  setPhotoCheckInPilot(false);
  setConditionStore(createMemoryConditionStore());
  resetSessionChanges();
});
afterEach(() => cleanup());

describe('ReturnCheckIn', () => {
  it('needs at least one returned item and staff initials', async () => {
    const user = renderReturn('RA-24141');

    await user.click(screen.getByRole('button', { name: 'Complete return' }));

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Mark at least one item as returned.');
    expect(alert.textContent).toContain('Enter your initials.');
  });

  it('needs a note for an item returned Damaged', async () => {
    const user = renderReturn('RA-24141');

    await user.click(screen.getByRole('checkbox', { name: 'Returned BUR-LT-0157' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Return condition for BUR-LT-0157' }), 'Damaged');
    await user.type(screen.getByLabelText('Counter staff initials'), 'of');
    await user.click(screen.getByRole('button', { name: 'Complete return' }));

    expect(screen.getByRole('alert').textContent).toContain('Add a note for BUR-LT-0157');
    expect(screen.getByRole('heading', { name: 'Return check-in' })).toBeDefined();
  });

  it('checks items in and flags damage to the Burbank counter lead', async () => {
    const user = renderReturn('RA-24141');

    await user.click(screen.getByRole('checkbox', { name: 'Returned BUR-LT-0142' }));
    await user.click(screen.getByRole('checkbox', { name: 'Returned BUR-LT-0157' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Return condition for BUR-LT-0157' }), 'Damaged');
    await user.type(screen.getByLabelText('Return notes for BUR-LT-0157'), 'Front glass cracked.');
    await user.type(screen.getByLabelText('Counter staff initials'), 'OF');
    await user.click(screen.getByRole('button', { name: 'Complete return' }));

    expect(screen.getByRole('status').textContent).toBe(
      'Return completed: 2 items checked in on RA-24141. 1 item flagged to Luis Ibarra.',
    );
    expect(screen.getByRole('heading', { name: 'Damage flags' })).toBeDefined();
    expect(screen.getByText('Flagged to Luis Ibarra')).toBeDefined();
    expect(screen.getAllByText('Front glass cracked.')).toHaveLength(2);
    expect(screen.getByText('1 of 4')).toBeDefined();
  });

  it('does not flag every line when photo check-in is turned off after rows were marked', async () => {
    setPhotoCheckInPilot(true);
    const user = renderReturn('RA-24153');

    await user.click(screen.getByRole('button', { name: 'Mark all returned' }));
    act(() => setPhotoCheckInPilot(false));
    await user.type(screen.getByLabelText('Counter staff initials'), 'LI');
    await user.click(screen.getByRole('button', { name: 'Complete return' }));

    expect(screen.getByRole('status').textContent).toContain('the agreement is marked Returned');
    expect(screen.getByRole('status').textContent).not.toContain('flagged');
    expect(screen.queryByRole('heading', { name: 'Damage flags' })).toBeNull();
  });

  it('marks the agreement Returned when the last items come back', async () => {
    const user = renderReturn('RA-24153');

    await user.click(screen.getByRole('button', { name: 'Mark all returned' }));
    await user.type(screen.getByLabelText('Counter staff initials'), 'LI');
    await user.click(screen.getByRole('button', { name: 'Complete return' }));

    expect(screen.getByRole('status').textContent).toContain('the agreement is marked Returned');
    expect(screen.getByText('0 of 2')).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Return check-in' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Damage flags' })).toBeNull();
  });

  it('does not let Mark all returned skip condition or photos when the Burbank pilot is on', async () => {
    setPhotoCheckInPilot(true);
    const user = renderReturn('RA-24153');

    await user.click(screen.getByRole('button', { name: 'Mark all returned' }));
    await user.type(screen.getByLabelText('Counter staff initials'), 'LI');
    await user.click(screen.getByRole('button', { name: 'Complete return' }));

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Set a return condition for BUR-LT-0166.');
    expect(alert.textContent).toContain('Add a return photo for BUR-LT-0166.');
    expect(alert.textContent).toContain('Set a return condition for BUR-GR-0225.');
    expect(alert.textContent).toContain('Customer acknowledgment is required');
    expect(screen.getByRole('heading', { name: 'Return check-in' })).toBeDefined();
  });

  it('saves a stamped return photo and condition record for the line', async () => {
    setPhotoCheckInPilot(true);
    const user = renderReturn('RA-24153');
    const file = new File(['return-photo'], 'return.jpg', { type: 'image/jpeg' });

    await user.click(screen.getByRole('checkbox', { name: 'Returned BUR-LT-0166' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Return condition for BUR-LT-0166' }), 'OK');
    await user.upload(screen.getByLabelText('Return photo for BUR-LT-0166'), file);
    await user.type(screen.getByLabelText('Customer name'), 'Sample Runner');
    await user.click(screen.getByRole('checkbox', { name: 'Customer acknowledges this condition record' }));
    await user.type(screen.getByLabelText('Counter staff initials'), 'LI');
    await user.click(screen.getByRole('button', { name: 'Complete return' }));

    expect(screen.getByRole('status').textContent).toContain('Return completed: 1 item checked in on RA-24153.');
    const media = await getConditionStore().loadAgreement('RA-24153');
    expect(media.photos).toHaveLength(1);
    expect(media.photos[0]).toMatchObject({
      assetTag: 'BUR-LT-0166',
      stage: 'return',
      stamp: { staffName: 'Luis Ibarra', staffInitials: 'LI' },
    });
    expect(media.photos[0].stamp.takenAt).toContain('T');
    expect(media.records[0]).toMatchObject({
      assetTag: 'BUR-LT-0166',
      stage: 'return',
      condition: 'OK',
      acknowledgment: { customerName: 'Sample Runner', method: 'tap-name-placeholder' },
    });
    expect(screen.queryByRole('textbox', { name: /stamp/i })).toBeNull();
  });
});
