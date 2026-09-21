/**
 * Timestamp formatting, built on `Intl` so it adds no dependency.
 *
 * A date library would be the obvious reach, but `Intl.DateTimeFormat` and
 * `Intl.RelativeTimeFormat` are in every browser this app supports and cost
 * nothing to ship.
 *
 * Both functions render in the **viewer's** locale and time zone, which is the
 * point: the server stores UTC and each reader sees their own clock.
 */

const absoluteFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/**
 * UTC, explicitly, and labelled as such.
 *
 * The one place a local rendering is the wrong answer: an audit entry's
 * `title` attribute is what someone reads when they are disputing *when*
 * something happened (audit spec FR-2.3), and two people in two time zones
 * comparing notes need the stored instant, not each of their own clocks.
 * Everything else in this app stays local, which is why this is a second
 * formatter rather than a change to `formatAbsolute`.
 */
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

/**
 * The relative form, e.g. "3 days ago" or "in 2 hours".
 *
 * Anything under a minute is "just now" rather than "in 0 seconds": a role
 * created a moment ago would otherwise read as a future event whenever the
 * client's clock sits a second ahead of the server's.
 */
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
