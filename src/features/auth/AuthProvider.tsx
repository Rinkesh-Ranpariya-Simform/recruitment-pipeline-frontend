'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { registerAuthHandlers } from '@/lib/api';
import { clearAccessToken } from './access-token';
import { refresh } from './api/auth.api';

/**
 * The three session states the whole app resolves to. Every route renders
 * against exactly one of them, and no view is rendered while the user is
 * unknown.
 */
export type SessionStatus = 'bootstrapping' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: SessionStatus;
  setStatus: (status: SessionStatus) => void;
  /**
   * True when the user ended the session themselves rather than having it
   * expire. Both land on `anonymous`, but only an expiry should send them back
   * to where they were — someone who clicked "log out" gets a plain `/login`.
   */
  signedOut: boolean;
  /** Ends the session deliberately. */
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }

  return value;
}

/**
 * Guarantees the bootstrap refresh runs **once per page load** rather than once
 * per component that needs auth. Module-scoped rather than a ref because React's
 * development StrictMode mounts effects twice, and each refresh rotates the
 * cookie server-side — a second, sequential refresh would look like token reuse.
 */
let bootstrapPromise: Promise<boolean> | null = null;

function bootstrapOnce(): Promise<boolean> {
  bootstrapPromise ??= refresh().then(
    () => true,
    () => false,
  );

  return bootstrapPromise;
}

/**
 * Establishes the session before anything authenticated renders.
 *
 * The access token lives only in memory, so every page load starts without one.
 * Bootstrap recovers it from the HttpOnly refresh cookie the browser sends
 * automatically; identity itself is then resolved by the ['auth','me'] query in
 * `useAuth`, which is the single source of truth for the user and their role.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ status: SessionStatus; signedOut: boolean }>({
    status: 'bootstrapping',
    signedOut: false,
  });
  const { status } = session;
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const setStatus = useCallback((next: SessionStatus) => {
    setSession({ status: next, signedOut: false });
  }, []);

  const signOut = useCallback(() => {
    setSession({ status: 'anonymous', signedOut: true });
  }, []);

  // Registered before bootstrap runs so the very first request already has a
  // failure path. `api.ts` stays free of React and router imports this way.
  useEffect(() => {
    registerAuthHandlers({
      onAuthFailure: () => {
        clearAccessToken();
        setStatus('anonymous');
        queryClient.clear();

        // Already on /login: redirecting again would loop, and the login form
        // has its own copy of the failure.
        if (pathname !== '/login') {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      },
      onForbidden: () => {
        // The server refused this account. It renders rather than disappearing
        // into a toast — a silent bounce is indistinguishable from a bug.
        router.replace('/forbidden');
      },
    });
  }, [pathname, queryClient, router, setStatus]);

  useEffect(() => {
    let active = true;

    void bootstrapOnce().then((recovered) => {
      if (!active) {
        return;
      }

      // A failed bootstrap has already run onAuthFailure, which sets the status
      // and redirects; only the success path needs to move it forward here.
      if (recovered) {
        setStatus('authenticated');
      }
    });

    return () => {
      active = false;
    };
  }, [setStatus]);

  const value = useMemo(
    () => ({ status, setStatus, signedOut: session.signedOut, signOut }),
    [status, session.signedOut, setStatus, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
