'use client';

import { cn } from 'cn';
import { ageingLevel } from '../ageing';

interface StageAgeingBadgeProps {
  candidateCount: number;
  avgDaysInStage: number | null;
  maxDaysInStage: number | null;
}

/**
 * The ageing line under a stage card's count (FR-3.5, FR-3.6).
 *
 * **The only consumer of `ageing.ts`** (FE-9), so "what counts as stuck" is
 * decided in one file and read in one place.
 *
 * Two facts it must not confuse:
 *
 * - **`null` renders `—`, never "0 days"** (XBE-7, EC-02). The API sends `null`
 *   exactly when the cell is empty, and "0 days" would claim there are people
 *   here who arrived just now.
 * - **`0` renders "avg 0d"** (EC-03). Someone who entered this stage a minute
 *   ago has been here zero days, which is true and is a different statement
 *   from the one above.
 *
 * The tone comes from `maxDaysInStage`, not the average: one person forgotten
 * for five weeks is the signal, and an average dilutes exactly that the moment
 * a few fresh applicants land in the same column.
 *
 * Colour is never the only carrier — the number is always written out, so the
 * card reads correctly in greyscale and for colour-blind users, the same rule
 * `RoleStatusBadge` follows.
 */
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

/**
 * `4.2` → `4.2d`, `11` → `11d`.
 *
 * The API rounds to one decimal place, so a whole number arrives as `11` rather
 * than `11.0` and printing it as "11.0d" would imply a precision the board does
 * not have. A fractional day is kept, because the difference between 0.4 and
 * 2.1 days in Screen is the one a recruiter reads on a fast-moving role.
 */
const formatDays = (days: number): string => {
  return `${Number.isInteger(days) ? days : days.toFixed(1)}d`;
};
