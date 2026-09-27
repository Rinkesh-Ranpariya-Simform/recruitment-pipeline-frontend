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

/** Debounce delay for numeric ID filter inputs. */
const DEBOUNCE_MS = 400;

/** Constant representing an unselected filter option. */
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

/** Filter controls for the audit trail: entity type, entity ID, and action dropdowns. */
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

  /** Clears entity type and associated entity ID from filter state. */
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

      {/* Disabled until an entity type is selected */}
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
          bare '/audit' */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(buildAuditHref({}))}>
          <XIcon aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  );
};
