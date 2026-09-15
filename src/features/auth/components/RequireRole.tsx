'use client';

import { NotFoundView } from '@/components/not-found-view';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

/**
 * Restricts a route to certain `UserRole`s. Always composed inside
 * `<RequireAuth>`, never instead of it.
 *
 * A user whose role isn't in `allow` gets the app's 404 rather than a 403 —
 * there's no reason to tell them the page exists. `/forbidden` is for the other
 * case: a server refusal on a route they can legitimately open.
 *
 * This only decides what to render. The backend re-authorizes every request, so
 * an interviewer's `GET /api/roles` is a 403 regardless.
 *
 * `<RequireAuth>` above guarantees a user is present by the time this renders,
 * so the `!user` branch is type narrowing rather than a loading state — showing
 * a 404 to a recruiter mid-bootstrap would be worse than what this prevents.
 */
export function RequireRole({
  allow,
  children,
}: {
  allow: readonly UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (!allow.includes(user.role)) {
    return <NotFoundView />;
  }

  return <>{children}</>;
}
