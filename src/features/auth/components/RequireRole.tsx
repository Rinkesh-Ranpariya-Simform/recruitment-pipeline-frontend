'use client';

import { NotFoundView } from '@/components/NotFoundView';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

interface RequireRoleProps {
  allow: ReadonlyArray<UserRole>;
  children: React.ReactNode;
}

/**
 * Restricts a route to certain `UserRole`s. Always composed inside
 * `<RequireAuth>`, never instead of it.
 *
 * A user whose role isn't in `allow` gets the app's 404 rather than a 403 —
 * there's no reason to tell them the page exists. `/forbidden` is for the other
 * case: a server refusal on a route they can legitimately open.
 *
 * This only decides what to render, and it is not a security control. Some of
 * what it hides isn't even refused server-side — an interviewer's
 * `GET /api/roles` is a legitimate 200; browsing adverts simply isn't their job.
 *
 * `<RequireAuth>` above guarantees a user is present by the time this renders,
 * so the `!user` branch is type narrowing rather than a loading state — showing
 * a 404 to a recruiter mid-bootstrap would be worse than what this prevents.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({ allow, children }) => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (!allow.includes(user.role)) {
    return <NotFoundView />;
  }

  return <>{children}</>;
};
