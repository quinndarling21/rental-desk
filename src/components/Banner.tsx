import type { ReactNode } from 'react';

interface BannerProps {
  tone: 'success' | 'error';
  children: ReactNode;
}

export function Banner({ tone, children }: BannerProps) {
  return (
    <div className={`banner banner--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
