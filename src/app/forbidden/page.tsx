'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { resolveRedirect } from '@/features/auth/redirect';

/**
 * The 403 view.
 *
 * **This is not dead code, and it is not orphaned by the absence of
 * `<RequireRole>`.** No client-side guard routes here — no route in this app is
 * role-gated. It is reached when the *server* refuses a call with
 * `403 FORBIDDEN`, which it may do on any request regardless of what the client
 * believes it is allowed to ask for. Deleting it would leave the app with no
 * rendering for a refusal.
 */
export default function ForbiddenPage() {
  const { role } = useAuth();
  const backHref = role ? resolveRedirect(null, role) : '/';

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You don&apos;t have access to that</CardTitle>
          <CardDescription>
            This account isn&apos;t permitted to perform that action. If you think it should be, ask
            whoever set up your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href={backHref} />}>Go back</Button>
        </CardContent>
      </Card>
    </main>
  );
}
