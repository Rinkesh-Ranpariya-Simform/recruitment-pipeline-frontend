import { Suspense } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { LoginForm } from '@/features/auth/components/LoginForm';

/**
 * The only unauthenticated view in the app.
 *
 * There is deliberately no signup link, no forgot-password link, and no
 * "request an account" affordance: this client creates no accounts and has no
 * password-reset flow. Accounts are provisioned by an operator against the API,
 * so the absence is the design, not a gap to fill in later. The `sdd` sign-in
 * page this layout follows ends with a "Sign up" link for that reason — it is
 * omitted here on purpose, not overlooked.
 *
 * `LoginForm` reads `?next=`, so it sits behind a Suspense boundary.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your Recruitment Pipeline account
          </p>
        </div>
        <Card>
          <CardContent>
            <Suspense>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
