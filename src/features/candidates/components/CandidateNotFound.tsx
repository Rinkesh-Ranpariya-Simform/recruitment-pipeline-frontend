'use client';

import Link from 'next/link';
import { FileQuestionIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Shown when `GET /api/candidates/:id` answers `404`, inside the app chrome
 * (FR-7.4, XBE-9).
 *
 * **It says the candidate was not found, and nothing else** (FR-7.5, ERR-2,
 * SEC-3, AC-F01). For an interviewer that `404` covers three causes — no such
 * candidate, an id that belongs to a recruiter, and "you are not assigned to
 * them" — and the API answers all three byte-identically on purpose. **The
 * client genuinely cannot tell which it is**, so a sentence mentioning access,
 * permissions or assignment would not be more helpful; it would hand back
 * exactly what the API withheld.
 *
 * A grep of this feature for such copy returns nothing, and **must keep
 * returning nothing** (AC-F34). The same rule `InterviewNotFound` already
 * follows.
 *
 * Not `notFound()` or Next's `not-found.tsx`: the route resolved fine, so
 * keeping the nav in place leaves the reader a way back to the list.
 */
export const CandidateNotFound: React.FC = () => {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <FileQuestionIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Candidate not found</h1>
        <p className="text-sm text-muted-foreground">
          This candidate doesn&apos;t exist, or the link that brought you here is out of date.
        </p>
      </div>
      <Button variant="outline" size="sm" render={<Link href="/candidates" />}>
        Back to candidates
      </Button>
    </section>
  );
};
