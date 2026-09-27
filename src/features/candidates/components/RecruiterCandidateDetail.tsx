'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { formatAbsolute } from '@/lib/format-date';
import { CandidateApplicationCard } from './CandidateApplicationCard';
import { ContactDetailsDialog } from './ContactDetailsDialog';
import type { RecruiterCandidate } from '../types';

/** Placeholder string for empty or missing values. */
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
  candidate: RecruiterCandidate;
}

/**
 * Detailed view of candidate for recruiters, showing contact info and application cards.
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
