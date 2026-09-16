'use client';

import { useEffect, useState } from 'react';

export function SessionLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="flex min-h-svh items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {visible && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div
            className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <p className="text-sm">Signing you in…</p>
        </div>
      )}
      <span className="sr-only">Loading your session</span>
    </div>
  );
}
