'use client';

import { cn } from 'cn';
import { ageingLevel } from '../ageing';

interface StageAgeingBadgeProps {
  candidateCount: number;
  avgDaysInStage: number | null;
  maxDaysInStage: number | null;
}

/** Displays average and maximum days in stage, with warning styling when ageing. */
export const StageAgeingBadge: React.FC<StageAgeingBadgeProps> = ({
  candidateCount,
  avgDaysInStage,
  maxDaysInStage,
}) => {
  if (candidateCount === 0 || avgDaysInStage === null || maxDaysInStage === null) {
    return (
      <p className="text-xs text-muted-foreground" aria-label="No candidates at this stage">
        —
      </p>
    );
  }

  const level = ageingLevel(maxDaysInStage);

  return (
    <p
      className={cn(
        'text-xs',
        level === 'alert'
          ? 'font-medium text-destructive'
          : level === 'warn'
            ? 'font-medium text-amber-600 dark:text-amber-500'
            : 'text-muted-foreground',
      )}
    >
      avg {formatDays(avgDaysInStage)} · oldest {formatDays(maxDaysInStage)}
    </p>
  );
};

/** Formats day counts to one decimal place if fractional, or integer if whole. */
const formatDays = (days: number): string => {
  return `${Number.isInteger(days) ? days : days.toFixed(1)}d`;
};
