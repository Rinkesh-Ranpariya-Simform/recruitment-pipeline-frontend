'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { UserRole } from '@/features/auth/types';
import { formatAbsolute } from '@/lib/format-date';

/** Human-readable labels for user roles. */
const ROLE_LABELS: Record<UserRole, string> = {
  CANDIDATE: 'Candidate',
  INTERVIEWER: 'Interviewer',
  RECRUITER: 'Recruiter',
};

interface RowProps {
  label: string;
  value: string;
}

const Row: React.FC<RowProps> = ({ label, value }) => {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-32 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{value}</dd>
    </div>
  );
};

/** Read-only profile page showing the signed-in user's info. */
export const ProfileView: React.FC = () => {
  const { user } = useAuth();

  // Type narrowing — user is guaranteed by RequireAuth.
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
};
