'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACTION_LABELS, ENTITY_LABELS } from '../labels';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  buildAuditHref,
  hasActiveAuditFilters,
  isAuditAction,
  isAuditEntityType,
} from '../search-params';
import type { AuditSearchParams } from '../search-params';

/**
 * One navigation per typed id rather than one per keystroke (VAL-2, PERF-2).
 * The spec names 400 ms; longer than the jobs search because an id is short and
 * typed in one burst.
 */
const DEBOUNCE_MS = 400;

/** The selects need a value for "All"; it can't be absent. */
const ALL = 'ALL';

interface Option {
  value: string;
  label: string;
}

const ENTITY_OPTIONS: ReadonlyArray<Option> = [
  { value: ALL, label: 'All entities' },
  ...AUDIT_ENTITY_TYPES.map((value) => ({ value, label: ENTITY_LABELS[value] })),
];

const ACTION_OPTIONS: ReadonlyArray<Option> = [
  { value: ALL, label: 'All actions' },
  ...AUDIT_ACTIONS.map((value) => ({ value, label: ACTION_LABELS[value] })),
];

interface AuditFiltersProps {
  params: AuditSearchParams;
}

/**
 * Entity type · entity id · action, all written to the URL rather than held in
 * state (FR-4.1, D-3).
 *
 * `actorId` has **no control** and is not rendered here (FR-4.4). It is
 * honoured from the URL so a future "everything this person did" deep link
 * works, but an id input a recruiter has to guess at is not a filter. It is
 * threaded through every href below so choosing an action does not silently
 * drop it.
 *
 * Every change resets `page` to 1 (FR-4.5): a filter change that leaves a
 * recruiter on page 7 of a two-page result looks broken.
 *
 * `router.push`, not `replace`, for the selects — Back should return to the
 * previous filter. The debounced id input uses `replace`, matching
 * `JobsSearch`: typing three digits should not leave three history entries.
 */
export const AuditFilters: React.FC<AuditFiltersProps> = ({ params }) => {
  const router = useRouter();
  const { entityType, entityId, action, actorId } = params;

  const [idTerm, setIdTerm] = useState(entityId === undefined ? '' : String(entityId));

  // Keeps the box in step when the URL changes from outside this component —
  // Back, or Clear filters. Adjusted during render rather than in an effect:
  // React's documented "reset state when a prop changes" pattern, which
  // re-runs this component with the new state before touching the DOM. An
  // effect would paint the stale value first and trip
  // `react-hooks/set-state-in-effect`.
  const [lastCommitted, setLastCommitted] = useState(entityId);

  if (entityId !== lastCommitted) {
    setLastCommitted(entityId);
    setIdTerm(entityId === undefined ? '' : String(entityId));
  }

  // `useRef` so the timer survives re-renders; cleared on unmount so a pending
  // navigation can't fire after the recruiter has left the page.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const onIdChange = (next: string) => {
    // Digits only — a non-numeric keystroke is never committed to the URL, and
    // never reaches the input's own state either.
    const digits = next.replace(/\D/g, '');
    setIdTerm(digits);

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => {
      const parsed = digits === '' ? undefined : Number(digits);
      const nextId = parsed !== undefined && parsed >= 1 ? parsed : undefined;

      // Typing and deleting a digit shouldn't push a duplicate navigation.
      if (nextId === entityId) {
        return;
      }

      router.replace(buildAuditHref({ entityType, entityId: nextId, action, actorId, page: 1 }));
    }, DEBOUNCE_MS);
  };

  /**
   * Choosing "All" for the entity type drops `entityType` **and `entityId`**
   * from the URL in one navigation (FR-4.3, EC-06) — `buildAuditHref` omits
   * the id whenever the type is absent, so this needs no special case. The
   * input then empties via the sync above and disables itself again.
   */
  const onEntityTypeChange = (value: string | null) => {
    const next = isAuditEntityType(value) ? value : undefined;

    router.push(
      buildAuditHref({
        entityType: next,
        entityId: next ? entityId : undefined,
        action,
        actorId,
        page: 1,
      }),
    );
  };

  const onActionChange = (value: string | null) => {
    router.push(
      buildAuditHref({
        entityType,
        entityId,
        action: isAuditAction(value) ? value : undefined,
        actorId,
        page: 1,
      }),
    );
  };

  const hasFilters = hasActiveAuditFilters(params);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        // Without `items`, base-ui's `SelectValue` renders the raw value, so
        // the trigger would read "ALL" instead of "All entities".
        items={ENTITY_OPTIONS}
        value={entityType ?? ALL}
        onValueChange={onEntityTypeChange}
      >
        <SelectTrigger size="sm" className="w-44" aria-label="Filter the trace by entity type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ENTITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Disabled until an entity type is chosen. An id alone is ambiguous
          across four tables and the API answers 400 (XBE-7), so the UI does
          not let a recruiter construct a request it knows will fail
          (FR-4.3, VAL-3). */}
      <Input
        type="text"
        inputMode="numeric"
        value={idTerm}
        disabled={entityType === undefined}
        onChange={(event) => onIdChange(event.target.value)}
        placeholder={entityType === undefined ? 'Select a type first' : 'Entity ID'}
        aria-label="Filter the trace by entity ID"
        className="w-40"
      />

      <Select items={ACTION_OPTIONS} value={action ?? ALL} onValueChange={onActionChange}>
        <SelectTrigger size="sm" className="w-52" aria-label="Filter the trace by action">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Only while something is actually filtering, and it navigates to a
          bare `/audit` — not `/audit?page=1` (FR-4.7, FR-4.8). */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(buildAuditHref({}))}>
          <XIcon aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  );
};
