/**
 * What counts as "stuck" (FR-3.6, FE-9).
 *
 * Two named constants in one file, so changing the answer is a single edit
 * rather than a hunt through JSX for a magic `14`. `StageAgeingBadge` is the
 * only consumer.
 *
 * They are thresholds on **`maxDaysInStage`**, not on the average: one
 * candidate forgotten for five weeks is the thing a recruiter needs to see, and
 * an average dilutes exactly that signal the moment the column has a few fresh
 * applicants in it.
 *
 * The numbers are a judgement, not a measurement — nothing in the brief names
 * them. They are set where a recruiter would recognise them: a fortnight is
 * "this needs a nudge", a month is "this has been dropped".
 */

/** Amber from here. A fortnight at one stage is worth a second look. */
export const AGEING_WARN_DAYS = 14;

/** Red from here, and it supersedes the warning. */
export const AGEING_ALERT_DAYS = 30;

/** How urgently a cell's ageing should read. `'none'` is the ordinary case. */
export type AgeingLevel = 'none' | 'warn' | 'alert';

/**
 * Grades a cell by its oldest occupant.
 *
 * `null` — which the API sends exactly when the cell is empty (XBE-7) — is
 * `'none'`, not `'alert'`: an empty column is not a stuck one, and treating a
 * missing number as a large one is how an empty board turns red.
 */
export const ageingLevel = (maxDaysInStage: number | null): AgeingLevel => {
  if (maxDaysInStage === null) {
    return 'none';
  }

  if (maxDaysInStage >= AGEING_ALERT_DAYS) {
    return 'alert';
  }

  if (maxDaysInStage >= AGEING_WARN_DAYS) {
    return 'warn';
  }

  return 'none';
};
