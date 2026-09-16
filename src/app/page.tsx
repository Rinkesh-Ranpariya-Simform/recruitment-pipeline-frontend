'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { resolveRedirect } from '@/features/auth/redirect';

const RoleRedirect: React.FC = () => {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role) {
      router.replace(resolveRedirect(null, role));
    }
  }, [role, router]);

  return null;
};

/**
 * The root route only decides where a signed-in user belongs.
 *
 * Role is known once `/api/auth/me` resolves, so the redirect waits for
 * bootstrap rather than guessing. `<RequireAuth>` supplies that wait — and the
 * anonymous and failed-identity paths — so this route can never sit blank on a
 * session it could not resolve.
 */
export default function Home() {
  return (
    <RequireAuth>
      <RoleRedirect />
    </RequireAuth>
  );
}
