import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetSessionChanges } from '../../lib/store';
import { AgreementDetail } from '../agreements/AgreementDetail';
import { ReturnCheckIn } from './ReturnCheckIn';

function renderReturn(raNumber: string) {
  render(
    <MemoryRouter initialEntries={[`/agreements/${raNumber}/return`]}>
      <Routes>
        <Route path="/agreements/:raNumber" element={<AgreementDetail />} />
        <Route path="/agreements/:raNumber/return" element={<ReturnCheckIn />} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

beforeEach(() => resetSessionChanges());
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
});
