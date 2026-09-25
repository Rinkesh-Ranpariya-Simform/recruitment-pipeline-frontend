'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { formatAbsolute } from '@/lib/format-date';
import { CandidateApplicationCard } from './CandidateApplicationCard';
import { ContactDetailsDialog } from './ContactDetailsDialog';
import type { RecruiterCandidate } from '../types';

/** No value recorded: an em dash, never a blank line (XBE-12, EC-06). */
const EMPTY = '—';

interface ContactRowProps {
  label: string;
  value: string | null;
}

const ContactRow: React.FC<ContactRowProps> = ({ label, value }) => {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {/* `break-words` rather than truncation: an email or a headline is what a
          recruiter came here to read, and a shortened one is not readable. */}
      <dd className="text-sm break-words">{value ?? EMPTY}</dd>
    </div>
  );
};

interface RecruiterCandidateDetailProps {
  /**
   * **A `RecruiterCandidate`, which this component's counterpart does not
   * accept and which is not accepted by it** (FE-4, AC-F33).
   *
   * `InterviewerCandidateDetail` takes an `InterviewerCandidate` and an array
   * of rounds. Neither component accepts the other's props, so a mistaken
   * dispatch in `[candidateId]/page.tsx` is a compile error rather than a
   * rendering bug nobody notices.
   */
  candidate: RecruiterCandidate;
}

/**
 * The whole candidate on one screen (FR-4.1, US-01).
 *
 * A header card with contact details and **Edit contact details**, then one
 * card per application — newest first, in the API's order — each holding the
 * role, the current stage, the status, the time at that stage, a stage
 * timeline, and the application's rounds with their panels and their feedback
 * (FR-4.2, FR-4.3, AC-F16, AC-F17).
 *
 * **One request** (FR-4.6, XBE-2, PERF-2, EC-15, AC-F28). However many
 * applications, rounds and assessments this candidate has, nothing here fetches
 * a second time: the feedback comes from this same payload, handed to
 * `<FeedbackList entries>` rather than looked up per round.
 *
 * **`profile` is always an object, never `null`** (XBE-12), so a candidate
 * nobody has recorded anything about renders three em dashes and is still
 * offered the edit dialog. There is no "no profile" empty state, because "no
 * phone recorded" is the normal state rather than a gap (EC-06).
 *
 * Not virtualised (PERF-10): a candidate has a handful of applications. If one
 * ever exceeds 25, the fix is pagination on the API side rather than a
 * windowing library here.
 */
export const RecruiterCandidateDetail: React.FC<RecruiterCandidateDetailProps> = ({
  candidate,
}) => {
  const { profile } = candidate;

  return (
    <article className="flex flex-col gap-6">
      <Link
        href="/candidates"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Candidates
      </Link>

      <Card className="gap-4 p-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{candidate.name}</h1>
            <p className="text-sm text-muted-foreground">
              Joined {formatAbsolute(candidate.createdAt)}
            </p>
          </div>

          {/* Offered even when nothing has been recorded yet — the first edit
              creates the profile row server-side by upsert, and this client
              sees no difference between create and update (EC-07, XBE-12). */}
          <ContactDetailsDialog candidate={candidate} />
        </header>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ContactRow label="Email" value={candidate.email} />
          <ContactRow label="Phone" value={profile.phone} />
          <ContactRow label="Location" value={profile.location} />
          <ContactRow label="Headline" value={profile.headline} />
        </dl>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          {candidate.applications.length === 1
            ? '1 application'
            : `${candidate.applications.length} applications`}
        </h2>

        {candidate.applications.length === 0 ? (
          // A candidate with no applications is ordinary: signing up is what
          // makes someone a candidate, applying is what puts them in a pipeline
          // (FR-4.5, EC-11, AC-F22).
          <p className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
            No applications yet.
          </p>
        ) : (
          candidate.applications.map((application) => (
            <CandidateApplicationCard key={application.id} application={application} />
          ))
        )}
      </section>
    </article>
  );
};
