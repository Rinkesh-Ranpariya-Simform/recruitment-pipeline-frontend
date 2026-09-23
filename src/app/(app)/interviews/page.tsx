import { Suspense } from 'react';

import { ApplicationsTableSkeleton } from '@/features/applications/components/ApplicationsTableSkeleton';
import { InterviewProcessTable } from '@/features/applications/components/InterviewProcessTable';
import { RecruiterApplicationsView } from '@/features/applications/components/RecruiterApplicationsView';

/**
 * `/interviews` — **the candidates currently in an interview process**, one row
 * per candidate per requisition (applications FR-6.1).
 *
 * It was a flat list of every round. The old shape listed a candidate once per
 * round, so a person on their third round appeared three times and the answer
 * to "who am I running a process for?" had to be assembled by eye. A round is a
 * step inside one person's process, not a thing to browse alongside other
 * people's; the process is the unit, and opening one is where the rounds live.
 *
 * **There is no action column**: a row is a whole process, and every action —
 * set a date, assign a panel, record a verdict — belongs to one round inside
 * it. So the row's only job is to open `/interviews/:applicationId`, and the
 * whole row is that target.
 *
 * It is the same component `/applications` renders, with `hasInterviews: true`
 * pinned and its own table of columns. The two lists really are one query with
 * one filter between them, so the filter is expressed as a filter rather than
 * as a second endpoint that would eventually disagree with this one.
 *
 * The `<RequireRole>` is the layout's now, and recruiter-only: every route in
 * this tree is, since an interviewer's round moved to `/my-interviews/:id`.
 */
export default function InterviewsPage() {
  return (
    // `useSearchParams()` requires a Suspense boundary — without one
    // `next build` fails, though `next dev` does not. The fallback is the
    // table's skeleton rather than a spinner, so the first paint is already
    // the right shape.
    <Suspense fallback={<ApplicationsTableSkeleton columns={6} />}>
      <RecruiterApplicationsView
        basePath="/interviews"
        title="Interviews"
        description="Candidates with at least one round scheduled. Open one to see its timeline and rounds."
        table={InterviewProcessTable}
        skeletonColumns={6}
        defaults={{ hasInterviews: true }}
        emptyMessage="No candidate is in an interview process yet."
        emptyHint="Start a phone screen from Applications to see someone here."
      />
    </Suspense>
  );
}
