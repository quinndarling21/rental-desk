import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CounterProvider } from '../../layout/CounterContext';
import { createMemoryConditionStore, setConditionStore } from '../../lib/conditionStore';
import { setPhotoCheckInPilot } from '../../lib/pilot';
import { resetSessionChanges } from '../../lib/store';
import { AgreementDetail } from '../agreements/AgreementDetail';
import { CheckOut } from './CheckOut';

function futureDate(): string {
  const due = new Date();
  due.setDate(due.getDate() + 14);
  const month = String(due.getMonth() + 1).padStart(2, '0');
  const day = String(due.getDate()).padStart(2, '0');
  return `${due.getFullYear()}-${month}-${day}`;
}

function renderCheckOut() {
  render(
    <MemoryRouter initialEntries={['/checkout']}>
      <CounterProvider>
        <Routes>
          <Route path="/checkout" element={<CheckOut />} />
          <Route path="/agreements/:raNumber" element={<AgreementDetail />} />
        </Routes>
      </CounterProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  localStorage.clear();
  setPhotoCheckInPilot(true);
  setConditionStore(createMemoryConditionStore());
  resetSessionChanges();
});
afterEach(() => cleanup());

describe('CheckOut photo check-in', () => {
  it('blocks check-out until every line has a photo, and the stamp is not editable', async () => {
    const user = renderCheckOut();
    const file = new File(['checkout-photo'], 'fresnel.jpg', { type: 'image/jpeg' });

    await user.type(screen.getByLabelText('Asset tag or barcode'), 'BUR-LT-0171');
    await user.click(screen.getByRole('button', { name: 'Add item' }));
    await user.click(screen.getByRole('button', { name: 'Complete check-out' }));

    expect(screen.getByRole('alert').textContent).toContain('Add a check-out photo for BUR-LT-0171.');
    expect(screen.getByRole('heading', { name: 'Check out' })).toBeDefined();

    await user.upload(screen.getByLabelText('Check-out photo for BUR-LT-0171'), file);
    expect(screen.getByText(/Luis Ibarra/)).toBeDefined();
    expect(screen.getByText(/Luis Ibarra/).textContent).toMatch(/\d:\d{2}/);
    expect(screen.queryByRole('textbox', { name: /stamp/i })).toBeNull();
  });

  it('does not require photos for an Atlanta agreement while the pilot switch is on', async () => {
    const user = renderCheckOut();

    await user.selectOptions(screen.getByLabelText('Location'), 'Atlanta');
    await user.type(screen.getByLabelText('Production'), 'Sample Shoot');
    await user.type(screen.getByLabelText('Due back'), futureDate());
    await user.type(screen.getByLabelText('Asset tag or barcode'), 'ATL-LT-0230');
    await user.click(screen.getByRole('button', { name: 'Add item' }));
    await user.type(screen.getByLabelText('Counter staff initials'), 'GK');
    await user.click(screen.getByRole('button', { name: 'Complete check-out' }));

    expect(screen.queryByText(/Add a check-out photo/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Sample Shoot' })).toBeDefined();
  });
});
