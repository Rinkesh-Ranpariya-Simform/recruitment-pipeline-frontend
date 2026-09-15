'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { resolveRedirect } from '@/features/auth/redirect';

/**
 * The 403 view.
 *
 * **`<RequireRole>` does not route here, and that is deliberate.** A user on a
 * route their role has no business with gets the app's **404** instead — being
 * told a page is refused is more than they were owed. This page is for the other
 * case: the *server* refusing a call with `403 FORBIDDEN` on a route the user
 * can legitimately open, which it may do on any request regardless of what the
 * client believes it is allowed to ask for. Deleting it would leave the app with
 * no rendering for a refusal.
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
