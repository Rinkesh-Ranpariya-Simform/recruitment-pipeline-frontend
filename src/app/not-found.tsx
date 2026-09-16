import { NotFoundView } from '@/components/NotFoundView';

/**
 * The route 404, for a URL that matches no route in the app.
 *
 * It renders **outside** the authenticated shell — there is no sidebar and no
 * account menu, because a 404 must render for an anonymous visitor too and
 * nothing here needs a session to be correct.
 *
 * `<RequireRole>` deliberately renders `NotFoundView` directly rather than
 * throwing `notFound()`: inside `(app)` the chrome is already painted, and a
 * user who is merely in the wrong place keeps their nav (FE-10.2).
 */
export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <NotFoundView />
    </main>
  );
}
