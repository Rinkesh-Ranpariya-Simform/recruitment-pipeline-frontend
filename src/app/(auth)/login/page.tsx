import { Suspense } from 'react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { LoginForm } from '@/features/auth/components/LoginForm';

/**
 * One of the app's two unauthenticated views; `/signup` is the other.
 *
 * There is now a signup link: the candidate feature added `/signup`, which
 * creates **candidates only**. There is still deliberately no forgot-password
 * link and no password-reset flow, and signup remains the app's only
 * account-creation surface — interviewers and recruiters are provisioned by an
 * operator running the backend's seed, so the absence of any affordance for
 * them is the design, not a gap to fill in later.
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
        <p className="text-center text-sm text-gray-400">
          New here?{' '}
          <Link href="/signup" className="text-white font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
