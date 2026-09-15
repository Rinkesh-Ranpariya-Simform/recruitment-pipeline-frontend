/**
 * Timestamp formatting, built on `Intl` so it adds no dependency.
 *
 * Ageing is this product's currency — how long a candidate has sat at a stage,
 * how old a requisition is — and a bare ISO string is not readable at a glance.
 * A date library would be the obvious reach; `Intl.DateTimeFormat` and
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

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** An absolute local date-time, e.g. "12 Sep 2026, 14:30". */
export function formatAbsolute(iso: string): string {
  const date = parse(iso);
  return date ? absoluteFormat.format(date) : INVALID;
}

/**
 * The relative form, e.g. "3 days ago" or "in 2 hours".
 *
 * Anything under a minute is "just now" rather than "in 0 seconds": a role
 * created a moment ago would otherwise read as a future event whenever the
 * client's clock sits a second ahead of the server's.
 */
export function formatRelative(iso: string): string {
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
}
