import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { SignupForm } from '@/features/auth/components/SignupForm';

/**
 * The second unauthenticated view, and the app's only account-creation surface.
 *
 * It creates **candidates and nothing else** — there is no role selector here,
 * and the rest of the old prohibition still stands: no interviewer
 * provisioning, no `/team`, no call to the user-listing endpoint. Interviewers
 * and recruiters are provisioned by an operator running the backend's seed.
 *
 * Unlike `LoginPage` this reads no `?next=`, so it needs no Suspense boundary: a
 * new account has no session to redirect anywhere, and the form sends them to
 * `/login` regardless.
 */
export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Apply to open positions and track where you are
          </p>
        </div>
        <Card>
          <CardContent>
            <SignupForm />
          </CardContent>
        </Card>
        <p className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-white font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
