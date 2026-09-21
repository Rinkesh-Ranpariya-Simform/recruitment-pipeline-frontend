import { formatAbsolute } from '@/lib/format-date';
import { isKnownAction, stageLabel, statusLabel } from '../labels';
import type { AuditAction } from '../types';

/**
 * The Details cell (FR-3).
 *
 * **This component is written to be total** (FE-7, ERR-3). `metadata` is an
 * open object whose shape depends on `action` (XBE-4) and it arrives from the
 * network, so nothing here indexes into it without a guard, every branch ends
 * at the fallback list, and no malformed payload can crash the table.
 *
 * It renders **text nodes only**. An override's `reason` and any fallback value
 * are the only free text on this screen and the only values that originated at
 * another user's keyboard; React escapes them and there is no
 * `dangerouslySetInnerHTML` anywhere in this feature (SEC-5, SEC-4).
 *
 * It also renders **whatever it is given** — it never filters `metadata` to
 * match an expectation. The API sends no email, phone or feedback `notes`
 * (XBE-6); if one ever appeared it would show up in the fallback list below,
 * which is exactly right: **that is a backend bug to report, not a field to
 * hide here** (FR-6.1, FR-6.2, SEC-3).
 */

/** Keys the per-action line above has already said. Everything else falls through. */
const FORMATTED_KEYS: Record<string, ReadonlyArray<string>> = {
  CANDIDATE_STAGE_CHANGED: ['fromStage', 'toStage'],
  STAGE_OVERRIDE_CREATED: ['fromStage', 'toStage', 'reason', 'skipped'],
  APPLICATION_OUTCOME_SET: ['fromStatus', 'toStatus', 'atStage'],
  INTERVIEW_CREATED: ['type', 'stage', 'scheduledAt'],
  INTERVIEWER_ASSIGNED: ['interviewerId'],
  INTERVIEWER_UNASSIGNED: ['interviewerId'],
  FEEDBACK_SUBMITTED: ['interviewId', 'rating'],
  FEEDBACK_UPDATED: ['interviewId', 'fromRating', 'toRating'],
  CANDIDATE_CONTACT_UPDATED: ['fields'],
};

/** Empty details read as an em dash, never as a blank cell (EC-03). */
const EMPTY = '—';

const str = (value: unknown): string | undefined => {
  return typeof value === 'string' && value !== '' ? value : undefined;
};

const num = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

/** `1 stage` / `2 stages`, or nothing at all when the count is absent. */
const skippedPhrase = (value: unknown): string | undefined => {
  const skipped = num(value);

  if (skipped === undefined) {
    return undefined;
  }

  return `skipped ${skipped} ${skipped === 1 ? 'stage' : 'stages'}`;
};

/** Joins the parts of a summary line, dropping the ones that weren't there. */
const line = (parts: ReadonlyArray<string | undefined>): string | undefined => {
  const present = parts.filter((part): part is string => part !== undefined && part !== '');

  return present.length > 0 ? present.join(' · ') : undefined;
};

/** `Applied → Screen`, when both ends are present. */
const transition = (from: unknown, to: unknown, label: (value: string) => string) => {
  const a = str(from);
  const b = str(to);

  if (a === undefined && b === undefined) {
    return undefined;
  }

  return `${a ? label(a) : '?'} → ${b ? label(b) : '?'}`;
};

/**
 * The summary line for a known action, or `undefined` for one this client does
 * not know — in which case the caller renders the fallback list alone (FR-3.3).
 */
const summaryOf = (action: AuditAction, metadata: Record<string, unknown>): string | undefined => {
  switch (action) {
    case 'CANDIDATE_STAGE_CHANGED':
      return transition(metadata.fromStage, metadata.toStage, stageLabel);

    case 'STAGE_OVERRIDE_CREATED':
      // The reason is NOT on this line — it gets its own, in full (FR-3.5).
      return line([
        transition(metadata.fromStage, metadata.toStage, stageLabel),
        skippedPhrase(metadata.skipped),
      ]);

    case 'APPLICATION_OUTCOME_SET': {
      const atStage = str(metadata.atStage);

      return line([
        transition(metadata.fromStatus, metadata.toStatus, statusLabel),
        atStage ? `at ${stageLabel(atStage)}` : undefined,
      ]);
    }

    case 'INTERVIEW_CREATED': {
      const stage = str(metadata.stage);
      const scheduledAt = str(metadata.scheduledAt);

      return line([
        str(metadata.type),
        stage ? `for ${stageLabel(stage)}` : undefined,
        // `formatAbsolute` returns an em dash for an unparseable string rather
        // than `Invalid Date`, so a malformed timestamp degrades quietly.
        scheduledAt ? formatAbsolute(scheduledAt) : undefined,
      ]);
    }

    case 'INTERVIEWER_ASSIGNED':
    case 'INTERVIEWER_UNASSIGNED': {
      const interviewerId = num(metadata.interviewerId);

      return interviewerId === undefined ? undefined : `Interviewer #${interviewerId}`;
    }

    case 'FEEDBACK_SUBMITTED': {
      const rating = num(metadata.rating);
      const interviewId = num(metadata.interviewId);

      return line([
        rating === undefined ? undefined : `Rated ${rating}/5`,
        interviewId === undefined ? undefined : `round #${interviewId}`,
      ]);
    }

    case 'FEEDBACK_UPDATED': {
      const from = num(metadata.fromRating);
      const to = num(metadata.toRating);
      const interviewId = num(metadata.interviewId);

      return line([
        from === undefined && to === undefined ? undefined : `Rating ${from ?? '?'} → ${to ?? '?'}`,
        interviewId === undefined ? undefined : `round #${interviewId}`,
      ]);
    }

    case 'CANDIDATE_CONTACT_UPDATED': {
      // The NAMES of the changed fields, which is all the API sends — never
      // their values (FR-3.1, XBE-6). Guarded because `fields` is an array on
      // the wire and an array is not something to trust untested.
      const fields = Array.isArray(metadata.fields)
        ? metadata.fields.filter((field): field is string => typeof field === 'string')
        : [];

      return fields.length === 0 ? undefined : `Changed: ${fields.join(', ')}`;
    }

    default:
      // Unreachable while the union and the backend agree. Reachable the day
      // the backend ships a tenth action first, and this is what stops that
      // being a crash (EC-01).
      return undefined;
  }
};

/**
 * A value in the fallback list.
 *
 * A nested object or array becomes `JSON.stringify` — but **only here**, never
 * as the primary render of a known action (FR-3.4, D-4). `JSON.stringify` can
 * throw on a circular structure, which JSON from the wire cannot contain; the
 * guard costs nothing and makes the claim in FE-7 true rather than nearly true.
 */
const fallbackValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

interface AuditMetadataProps {
  action: AuditAction;
  metadata: Record<string, unknown>;
}

export const AuditMetadata: React.FC<AuditMetadataProps> = ({ action, metadata }) => {
  // Defensive: `metadata` is typed as an object, but it arrives from the
  // network and `typeof null === 'object'`.
  const safe = metadata !== null && typeof metadata === 'object' ? metadata : {};

  const known = isKnownAction(action);
  const summary = known ? summaryOf(action, safe) : undefined;
  const reason = action === 'STAGE_OVERRIDE_CREATED' ? str(safe.reason) : undefined;

  // Everything the summary line did not already say. For an unknown action
  // that is the whole object, which is the point (FR-3.3).
  const handled = known ? (FORMATTED_KEYS[action] ?? []) : [];
  const leftovers = Object.entries(safe).filter(([key]) => !handled.includes(key));

  if (summary === undefined && reason === undefined && leftovers.length === 0) {
    return <span className="text-muted-foreground">{EMPTY}</span>;
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {summary !== undefined && <p className="text-sm">{summary}</p>}

      {/* In full, wrapped, never truncated and never behind a "show more":
          it is the field the brief requires be recorded, and a trace that
          elides it defeats the point (FR-3.5, EC-04). */}
      {reason !== undefined && (
        <p className="text-sm break-words whitespace-pre-wrap text-muted-foreground">“{reason}”</p>
      )}

      {leftovers.length > 0 && (
        <dl className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          {leftovers.map(([key, value]) => (
            <div key={key} className="flex gap-1.5">
              <dt className="font-mono">{key}:</dt>
              <dd className="min-w-0 break-words">{fallbackValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
