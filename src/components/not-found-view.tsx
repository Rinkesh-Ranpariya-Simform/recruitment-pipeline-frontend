import Link from 'next/link';
import { FileQuestionIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * The app's one **route** 404 — "this URL is not a page you can open".
 *
 * Two surfaces render it and they must stay identical, which is why it is a
 * component and not markup copied twice: `app/not-found.tsx` for a URL that
 * matches no route at all, and `<RequireRole>` for a route that exists but not
 * for this user. A user who is not allowed somewhere learns the same thing as a
 * user who mistyped, and neither is told that the other case is possible — that
 * is the whole point of answering a forbidden route with a 404 rather than a
 * 403 (FE-10.2, FE-10.5).
 *
 * Do not confuse it with `features/roles/components/RoleNotFound.tsx`, which is
 * a **data** 404: `/roles/999` is a real route, reached by a real recruiter, for
 * a requisition that does not exist. That one keeps the nav and offers a way
 * back to the list; this one is the end of the road and offers only `/`.
 *
 * The way back is `/` and never a role-specific path, so this renders correctly
 * for an anonymous visitor as well — `/` resolves the session itself and sends a
 * signed-in user to their own landing route.
 */
export function NotFoundView() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <FileQuestionIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This page doesn&apos;t exist, or the link that brought you here is out of date.
        </p>
      </div>
      <Button variant="outline" size="sm" render={<Link href="/" />}>
        Go back
      </Button>
    </div>
  );
}
