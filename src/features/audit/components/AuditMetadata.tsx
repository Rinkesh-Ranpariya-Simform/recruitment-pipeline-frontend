import { formatAbsolute } from '@/lib/format-date';
import { isKnownAction, stageLabel, statusLabel } from '../labels';
import type { AuditAction } from '../types';

/** Component rendering structured action metadata details and fallback key-value pairs. */

/** Keys already displayed in the action summary line. */
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

/** Renders an em-dash for empty metadata. */
const EMPTY = '—';

const str = (value: unknown): string | undefined => {
  return typeof value === 'string' && value !== '' ? value : undefined;
};

const num = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

/** Formats skipped stage counts into a readable string. */
const skippedPhrase = (value: unknown): string | undefined => {
  const skipped = num(value);

  if (skipped === undefined) {
    return undefined;
  }

  return `skipped ${skipped} ${skipped === 1 ? 'stage' : 'stages'}`;
};

/** Combines text parts into a single summary line. */
const line = (parts: ReadonlyArray<string | undefined>): string | undefined => {
  const present = parts.filter((part): part is string => part !== undefined && part !== '');

  return present.length > 0 ? present.join(' · ') : undefined;
};

/** Formats stage transition transitions (e.g. Applied → Screen). */
const transition = (from: unknown, to: unknown, label: (value: string) => string) => {
  const a = str(from);
  const b = str(to);

  if (a === undefined && b === undefined) {
    return undefined;
  }

  return `${a ? label(a) : '?'} → ${b ? label(b) : '?'}`;
};

/** Generates a human-readable summary line for standard audit actions. */
const summaryOf = (action: AuditAction, metadata: Record<string, unknown>): string | undefined => {
  switch (action) {
    case 'CANDIDATE_STAGE_CHANGED':
      return transition(metadata.fromStage, metadata.toStage, stageLabel);

    case 'STAGE_OVERRIDE_CREATED':
      // The reason is rendered on its own line in full.
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
      // their values. Guarded because `fields` is an array on
      // the wire and an array is not something to trust untested.
      const fields = Array.isArray(metadata.fields)
        ? metadata.fields.filter((field): field is string => typeof field === 'string')
        : [];

      return fields.length === 0 ? undefined : `Changed: ${fields.join(', ')}`;
    }

    default:
      // Return undefined for unknown or unhandled action types
      return undefined;
  }
};

/** Renders a single metadata value, formatting objects or primitives safely. */
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
  // render fallback representation for unknown metadata.
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
          render reason in full */}
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
