'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * Placeholder landing route for interviewers. It renders the authenticated user
 * only — assigned rounds and feedback belong to later features.
 */
export default function MyInterviewsPage() {
  const { user } = useAuth();

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">My interviews</h1>
      <p className="text-sm text-muted-foreground">
        Signed in as {user?.name} ({user?.role}).
      </p>
    </section>
  );
}
