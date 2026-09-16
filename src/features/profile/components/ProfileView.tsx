'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { UserRole } from '@/features/auth/types';
import { formatAbsolute } from '@/lib/format-date';

/**
 * A `Record<UserRole, …>` like every other role-keyed map here, so a new role is
 * a compile error rather than a blank field.
 */
const ROLE_LABELS: Record<UserRole, string> = {
  CANDIDATE: 'Candidate',
  INTERVIEWER: 'Interviewer',
  RECRUITER: 'Recruiter',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-32 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{value}</dd>
    </div>
  );
}

/**
 * Who you are signed in as — for **every** role, not just candidates.
 *
 * Reads the already-cached user from `useAuth`, so this page issues **no
 * request** of its own. `getMe` owns that data and there is no profile endpoint;
 * adding a second query for the same fact would be a second thing to keep in
 * step.
 *
 * **There is no Edit button, and deliberately not a disabled one either.** No
 * endpoint writes a `User` row after creation, so an affordance would promise
 * something that does not exist — the absence is the honest rendering, and it
 * means "a candidate cannot edit their profile" needs no check to enforce it.
 */
export function ProfileView() {
  const { user } = useAuth();

  // `RequireAuth` guarantees a user by the time this renders; this is type
  // narrowing, not a loading state.
  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">The account you are signed in as.</p>
      </div>

      <Card>
        <CardContent>
          <dl className="space-y-4">
            <Row label="Name" value={user.name} />
            <Row label="Email" value={user.email} />
            <Row label="Role" value={ROLE_LABELS[user.role] ?? user.role} />
            <Row label="Member since" value={formatAbsolute(user.createdAt)} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
