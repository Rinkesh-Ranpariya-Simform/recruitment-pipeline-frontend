'use client';

import { ArrowRightIcon, ShieldAlertIcon } from 'lucide-react';

import { formatAbsolute } from '@/lib/format-date';
import { pipelineStageLabel, pipelineStatusLabel } from '@/features/pipeline/labels';
import { cn } from 'cn';
import type { CandidateStageHistoryEntry } from '../types';

/**
 * Vertical timeline component displaying an application's stage transitions,
 * including who made each change, timestamps, and override details.
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
            {/* Render override reason in full with line breaks preserved */}
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
