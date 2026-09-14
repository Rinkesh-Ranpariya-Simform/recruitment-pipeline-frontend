'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * Placeholder landing route for recruiters. It renders the authenticated user
 * only — candidate counts per stage and ageing belong to the pipeline feature.
 */
export default function PipelinePage() {
  const { user } = useAuth();

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Pipeline</h1>
      <p className="text-sm text-muted-foreground">
        Signed in as {user?.name} ({user?.role}).
      </p>
    </section>
  );
}
