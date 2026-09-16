'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useAuthContext } from '../AuthProvider';
import { useAuth } from '../hooks/useAuth';
import { SessionLoading } from './SessionLoading';

/** Mirrors the spec's Error Handling table for a 500 or an unreachable backend. */
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Gates the authenticated shell on a resolved session.
 *
 * **This is a UX affordance, never the security control.** The backend
 * re-authorizes every request independently; this component only decides what
 * to paint while that is true or not yet known. Nothing it hides is protected by
 * being hidden.
 *
 * Until bootstrap resolves it renders a full-page loading state — never the app
 * chrome with empty data, and never a flash of the login page.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, signedOut } = useAuthContext();
  const { user, identityError, retryIdentity } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') {
      // Someone who clicked "log out" is not trying to get back here, so their
      // session end carries no `next`. An expiry does — it interrupted them.
      router.replace(signedOut ? '/login' : `/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, signedOut, pathname, router]);

  // Identity could not be resolved and a refresh would not help — a 500 or an
  // unreachable backend. The session is real, so this is not a redirect to
  // /login; it is a retryable error. Without this branch the loading state
  // below would spin indefinitely, which the spec forbids.
  if (status === 'authenticated' && identityError) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center" role="alert">
          <p className="text-sm text-muted-foreground">{GENERIC_ERROR_MESSAGE}</p>
          <Button variant="outline" size="sm" onClick={retryIdentity}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // 'anonymous' also lands here: the redirect above is in flight, and showing
  // the shell in the meantime would be the flash this exists to prevent.
  if (status !== 'authenticated' || !user) {
    return <SessionLoading />;
  }

  return <>{children}</>;
}
