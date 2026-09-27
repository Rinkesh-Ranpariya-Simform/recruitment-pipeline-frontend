/** Timestamp formatting using built-in Intl APIs. Renders in the viewer's locale and timezone. */

const absoluteFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** UTC formatter for audit entries where the exact stored instant matters. */
const utcFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

/** Largest unit first: the loop stops at the first one the gap fills. */
const RELATIVE_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** An unparseable timestamp renders as an em dash — never `Invalid Date`. */
const INVALID = '—';

const parse = (iso: string): Date | null => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** An absolute local date-time, e.g. "12 Sep 2026, 14:30". */
export const formatAbsolute = (iso: string): string => {
  const date = parse(iso);
  return date ? absoluteFormat.format(date) : INVALID;
};

/** The absolute instant in UTC, e.g. "18 Sep 2026, 09:14:02 UTC". */
export const formatAbsoluteUtc = (iso: string): string => {
  const date = parse(iso);
  return date ? `${utcFormat.format(date)} UTC` : INVALID;
};

/** Relative time, e.g. "3 days ago". Anything under a minute shows "just now". */
export const formatRelative = (iso: string): string => {
  const date = parse(iso);

  if (!date) {
    return INVALID;
  }

  const elapsed = date.getTime() - Date.now();

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return relativeFormat.format(Math.round(elapsed / ms), unit);
    }
  }

  return 'just now';
};
