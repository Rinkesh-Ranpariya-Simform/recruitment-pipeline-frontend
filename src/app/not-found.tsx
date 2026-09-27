import { NotFoundView } from '@/components/NotFoundView';

/** Global 404 route component rendered for unmatched URLs. */
export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <NotFoundView />
    </main>
  );
}
