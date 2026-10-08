import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StampedPhoto } from './StampedPhoto';

describe('StampedPhoto', () => {
  it('shows the date, time, and staff member with no way to edit them', () => {
    render(
      <StampedPhoto
        src="data:image/gif;base64,R0lGODlhAQABAAAAACw="
        alt="Check-out photo of BUR-LT-0171"
        stamp={{
          takenAt: '2026-10-08T15:04:00.000Z',
          staffId: 'omar-farouk',
          staffName: 'Omar Farouk',
          staffInitials: 'OF',
        }}
      />,
    );

    const caption = screen.getByText(/Omar Farouk/);
    expect(caption.textContent).toMatch(/\d:\d{2}/);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByLabelText(/stamp/i)).toBeNull();
  });
});
