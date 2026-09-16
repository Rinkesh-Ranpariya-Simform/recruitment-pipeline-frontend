import type { UserRole } from './types';

/** Where each role lands when no explicit `?next=` target applies. */
const ROLE_LANDING: Record<UserRole, string> = {
  RECRUITER: '/pipeline',
  INTERVIEWER: '/my-interviews',
  CANDIDATE: '/jobs',
};

/**
 * Resolves where to send a user after a successful login.
 *
 * A `?next=` target is honoured **only** when it is a same-origin relative path:
 * it must start with a single `/` and not `//`. An absolute URL
 * (`https://evil.example.com`) or a protocol-relative one (`//evil.example.com`)
 * is discarded in favour of the role default — that is the open-redirect guard.
 *
 * This validates the *shape* of `next`, never that the route exists. A stale
 * bookmark to a removed route is honoured and renders the app's 404, which is
 * correct and honest.
 */
export function resolveRedirect(next: string | null | undefined, role: UserRole): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }

  return ROLE_LANDING[role];
}
