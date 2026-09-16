'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { buildJobsHref } from '../search-params';

/** Long enough that a typed word is one request, short enough to feel live. */
const DEBOUNCE_MS = 300;

/**
 * Title search, written to the URL rather than held in state.
 *
 * The URL is the source of truth (`parseJobsSearchParams`), so reload and Back
 * both work with no cache handling. This component holds only the in-flight
 * input value until the debounce fires.
 *
 * Typing "engineer" is **one** request, not eight. Without the debounce, every
 * keystroke would be a key change and a fetch.
 */
export function JobsSearch({ value }: { value: string | undefined }) {
  const router = useRouter();
  const [term, setTerm] = useState(value ?? '');

  // Keeps the box in step when the URL changes from outside this component — the
  // Back button, or the empty state's "Clear search".
  //
  // Adjusted during render rather than in an effect. That is React's documented
  // pattern for "reset state when a prop changes": React re-runs this component
  // immediately with the new state, before touching the DOM, so there is no
  // flash of the stale term and no cascading re-render of the tree. An effect
  // here would paint the old value first and trip
  // `react-hooks/set-state-in-effect`.
  const [lastCommitted, setLastCommitted] = useState(value);

  if (value !== lastCommitted) {
    setLastCommitted(value);
    setTerm(value ?? '');
  }

  const committed = value ?? '';

  // `useRef` so the timer survives re-renders; cleared on unmount so a pending
  // navigation can't fire after the user has left the page.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const onChange = (next: string) => {
    setTerm(next);

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => {
      const trimmed = next.trim();

      // Nothing to do if the committed term hasn't actually changed — typing and
      // deleting a character shouldn't push a duplicate history entry.
      if (trimmed === committed) {
        return;
      }

      // Always back to page 1: staying on page 3 of the old result set would
      // show an empty page for a narrower search.
      router.replace(buildJobsHref({ q: trimmed === '' ? undefined : trimmed, page: 1 }));
    }, DEBOUNCE_MS);
  };

  return (
    <div className="relative max-w-sm">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={term}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by title"
        // Visually implied by the icon and placeholder; screen readers need it
        // named.
        aria-label="Search open positions by title"
        className="pl-9"
      />
    </div>
  );
}
