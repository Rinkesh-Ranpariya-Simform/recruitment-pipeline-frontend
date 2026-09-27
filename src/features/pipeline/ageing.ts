/** Thresholds defining when an application is considered ageing or stalled in a stage. */

/** Days before an application triggers an ageing warning (amber). */
export const AGEING_WARN_DAYS = 14;

/** Days before an application triggers an ageing alert (red). */
export const AGEING_ALERT_DAYS = 30;

/** Ageing urgency level: 'none', 'warn', or 'alert'. */
export type AgeingLevel = 'none' | 'warn' | 'alert';

/** Evaluates the ageing level based on the maximum days spent in a stage. */
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
