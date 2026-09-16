import { Suspense } from 'react';

import { RequireAnonymous } from '@/features/auth/components/RequireAnonymous';
import { SessionLoading } from '@/features/auth/components/SessionLoading';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SessionLoading />}>
      <RequireAnonymous>{children}</RequireAnonymous>
    </Suspense>
  );
}
