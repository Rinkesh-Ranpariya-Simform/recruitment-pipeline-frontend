'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuthContext } from '../AuthProvider';
import { useAuth } from '../hooks/useAuth';
import { resolveRedirect } from '../redirect';
import { SessionLoading } from './SessionLoading';

interface RequireAnonymousProps {
  children: React.ReactNode;
}

/**
 * The inverse of `<RequireAuth>`: gates the unauthenticated views on a resolved
 * session, so a signed-in user is never shown a form asking for credentials the
 * app already has.
 *
 * The ordering is the whole point. Every page load starts at `bootstrapping`
 * with no access token, and resolving the session costs two sequential requests
 * — `POST /api/auth/refresh`, then `GET /api/auth/me` for the role that decides
 * where the user belongs. Rendering the form during that window and redirecting
 * afterwards is what produced the visible flash; holding the screen until the
 * answer is known is what removes it.
 *
 * **A UX affordance, never a security control** — see `<RequireAuth>`.
 *
 * `router.replace`, not `push`: `/login` must not enter history, or the back
 * button would bounce a signed-in user straight back into this redirect.
 */
export const RequireAnonymous: React.FC<RequireAnonymousProps> = ({ children }) => {
  const { status } = useAuthContext();
  const { role, identityError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // An expired session was sent here with `?next=`, so an interrupted user
  // resumes where they were rather than at their role's landing page. It is
  // validated by `resolveRedirect` — an absolute or protocol-relative target is
  // discarded, which is the open-redirect guard.
  const next = searchParams.get('next');

  useEffect(() => {
    if (status === 'authenticated' && role) {
      router.replace(resolveRedirect(next, role));
    }
  }, [status, role, next, router]);

  // `authenticated` also waits here: the redirect above is either in flight or
  // one `/me` response away, and the form must not appear in between.
  //
  // `identityError` is the exception. The session is real but its identity
  // cannot be resolved — a 500 or an unreachable backend — so there is no role
  // to redirect on and no second request that would help. Falling through to the
  // login form gives that user a way out; a spinner would strand them.
  if (status === 'bootstrapping' || (status === 'authenticated' && !identityError)) {
    return <SessionLoading />;
  }

  return <>{children}</>;
};
