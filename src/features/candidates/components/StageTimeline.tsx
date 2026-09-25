'use client';

import { ArrowRightIcon, ShieldAlertIcon } from 'lucide-react';

import { formatAbsolute } from '@/lib/format-date';
import { pipelineStageLabel, pipelineStatusLabel } from '@/features/pipeline/labels';
import { cn } from 'cn';
import type { CandidateStageHistoryEntry } from '../types';

/**
 * One application's **stage history**, as a vertical timeline (FR-5).
 *
 * Not to be confused with `features/applications/components/StageTimeline.tsx`,
 * which renders a different thing for a different reader: that one is the
 * backend-built `TimelineNode` array — a horizontal chip row narrating a
 * candidate's own process, with no actor and no reason on it. This one is the
 * recruiter's audit of **how** each stage was entered: who moved them, when,
 * and — where the override path was used — why, in the recruiter's own words.
 *
 * Three rules, and all three are about not editorialising:
 *
 * - **The API's order is the order.** Oldest first, because a history reads
 *   forwards, and **this component does not re-sort** (FR-5.1, XBE-5).
 * - **The first entry renders as "Applied", not `null → Applied`** (FR-5.3,
 *   EC-14). `fromStage` is null there and only there; a transition arrow from
 *   nothing is not a transition.
 * - **An override's reason is rendered in full, never truncated, with no "show
 *   more"** (FR-5.5, EC-13). The brief requires the override be genuinely
 *   recorded, and this is the screen where that record is read — a 900-character
 *   reason wraps rather than being cut off.
 *
 * The recruiter's vocabulary throughout (`features/pipeline/labels.ts`), not
 * the candidate's: this is a process log, so `REJECTED` reads "Rejected" rather
 * than "Not selected".
 *
 * ## Accessibility
 *
 * An ordered list, because the order is the meaning. An override is marked by
 * an icon and the word **Override** as well as by its destructive tone, so the
 * distinction survives a screen reader and a monochrome print — colour never
 * carries it alone.
 */

interface StageTimelineProps {
  entries: Array<CandidateStageHistoryEntry>;
}

interface StageTimelineEntryProps {
  entry: CandidateStageHistoryEntry;
  isLast: boolean;
}

/**
 * The transition, as words.
 *
 * A terminal outcome moves the status and not the stage, so the two ends are
 * equal on those rows — `Screen → Screen` says nothing. Those read as the
 * status instead, which is what actually changed.
 */
const transitionLabel = (entry: CandidateStageHistoryEntry): React.ReactNode => {
  if (entry.fromStage === null) {
    return <span className="font-medium">{pipelineStageLabel(entry.toStage)}</span>;
  }

  if (entry.fromStage === entry.toStage) {
    return (
      <span className="font-medium">
        {pipelineStageLabel(entry.toStage)} · {pipelineStatusLabel(entry.toStatus)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      {pipelineStageLabel(entry.fromStage)}
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {pipelineStageLabel(entry.toStage)}
    </span>
  );
};

const StageTimelineEntry: React.FC<StageTimelineEntryProps> = ({ entry, isLast }) => {
  const override = entry.override;

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* The rail. Hidden on the last row so the line stops at the last dot
          rather than trailing into nothing. */}
      {!isLast && (
        <span className="absolute top-3 bottom-0 left-[5px] w-px bg-border" aria-hidden="true" />
      )}

      <span
        aria-hidden="true"
        className={cn(
          'relative mt-1.5 size-2.5 shrink-0 rounded-full ring-3 ring-background',
          override ? 'bg-destructive' : 'bg-muted-foreground/50',
        )}
      />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {transitionLabel(entry)}

          {override && (
            // The word as well as the colour (see the note above).
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              <ShieldAlertIcon className="size-3" aria-hidden="true" />
              Override
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {entry.changedBy.name} · {formatAbsolute(entry.createdAt)}
        </p>

        {override && (
          <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            {/* `whitespace-pre-wrap` and no line clamp: rendered in full, always
                (FR-5.5, EC-13). It is a recruiter's own words about a person's
                process and it is escaped text, never HTML (SEC-5). */}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{override.reason}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Recorded by {override.performedBy.name} · {formatAbsolute(override.createdAt)}
            </p>
          </div>
        )}
      </div>
    </li>
  );
};

export const StageTimeline: React.FC<StageTimelineProps> = ({ entries }) => {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No stage history recorded.</p>;
  }

  return (
    <ol aria-label="Stage history">
      {entries.map((entry, index) => (
        <StageTimelineEntry key={entry.id} entry={entry} isLast={index === entries.length - 1} />
      ))}
    </ol>
  );
};
