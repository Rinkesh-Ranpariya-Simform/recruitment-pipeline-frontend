import type {
  ApplicationStatus,
  InterviewType,
  PipelineStage,
  TimelineNode,
  TimelineNodeState,
} from './types';

/**
 * How a candidate reads their own application, and how the stage transition
 * timeline reads for **both** audiences.
 *
 * Every map here is a `Record<>` **lookup table, not a comparison**, keyed by
 * the union — so a value added to a backend enum is a compile error rather than
 * a blank cell. Same discipline as `NAV_SECTIONS`.
 *
 * The application copy is deliberately candidate-facing rather than internal: a
 * rejected applicant reads "Not selected", not the pipeline's `REJECTED`.
 * `features/pipeline/labels.ts` is the recruiter's vocabulary for the same two
 * enums, and the two are separate on purpose.
 */

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  ACTIVE: 'In progress',
  HIRED: 'Hired',
  REJECTED: 'Not selected',
};

export const STAGE_LABELS: Record<PipelineStage, string> = {
  APPLIED: 'Applied',
  SCREEN: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
};

/**
 * The label, or the raw value if the backend ever sends something this client
 * doesn't know.
 *
 * Type-safe code should make that unreachable — but a payload is untrusted
 * input, and rendering `SOMETHING_NEW` is better than rendering a blank cell or
 * throwing. The lookups are indexed through a widened key for exactly that case.
 */
export const statusLabel = (status: ApplicationStatus): string => {
  return (STATUS_LABELS as Record<string, string | undefined>)[status] ?? status;
};

export const stageLabel = (stage: PipelineStage): string => {
  return (STAGE_LABELS as Record<string, string | undefined>)[stage] ?? stage;
};

/* -------------------------------------------------------------------------
 * The stage transition timeline
 * ---------------------------------------------------------------------- */

/**
 * A stage, in the PAST TENSE, as a step somebody has been through.
 *
 * A third stage vocabulary, and it earns its place: the timeline narrates what
 * happened, so its nodes read `Screened`, not `Screening` (the candidate list's
 * present-progressive) and not `Screen` (the recruiter board's column heading).
 * "Screening" beside a green tick would say the candidate is being screened
 * right now, which is precisely what a passed node means they are not.
 */
export const TIMELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  APPLIED: 'Applied',
  SCREEN: 'Screened',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
};

/**
 * The round type, in the parenthetical of a timeline node.
 *
 * A second copy of `features/interviews/labels.ts`'s map, and this one is a
 * deliberate duplication rather than an import: `features/applications` is
 * reachable by a CANDIDATE, and importing from the interviews feature would put
 * a module full of recruiter and interviewer shapes into their bundle for the
 * sake of five strings.
 */
export const TIMELINE_TYPE_LABELS: Record<InterviewType, string> = {
  PHONE_SCREEN: 'Phone screen',
  TECHNICAL: 'Technical',
  SYSTEM_DESIGN: 'System design',
  CULTURE_FIT: 'Culture fit',
  HIRING_MANAGER: 'Hiring manager',
};

/**
 * What a node says, as `{ label, detail }`.
 *
 * `detail` is the parenthetical — the round type — and is null on the two nodes
 * that have none. Assembling the label here rather than in the component means
 * the candidate's card and the recruiter's detail page cannot word the same
 * process differently.
 *
 * The `?? node.stage ?? '—'` chain is for a payload naming something this client
 * does not know: rendering a raw enum value beats rendering a blank pill.
 */
export const timelineNodeLabel = (node: TimelineNode): { label: string; detail: string | null } => {
  if (node.kind === 'OUTCOME') {
    return {
      label: node.status ? statusLabel(node.status) : 'Closed',
      detail: null,
    };
  }

  const label = node.stage
    ? ((TIMELINE_STAGE_LABELS as Record<string, string | undefined>)[node.stage] ?? node.stage)
    : '—';

  if (node.kind === 'APPLIED' || node.interviewType === null) {
    return { label, detail: null };
  }

  return {
    label,
    detail:
      (TIMELINE_TYPE_LABELS as Record<string, string | undefined>)[node.interviewType] ??
      node.interviewType,
  };
};

/**
 * The colour of a node, as Tailwind classes.
 *
 * **Green for passed, red for rejected, neutral for pending** — the one rule the
 * timeline has, stated once here so the two call sites cannot disagree about it.
 *
 * `PENDING` is deliberately not amber or any other warning tone: a round nobody
 * has decided yet is the normal state of a round, not a problem. Colour alone
 * also never carries the meaning — every node renders its own text and an icon
 * beside it, so the timeline is readable without seeing colour at all.
 */
export const TIMELINE_STATE_CLASSES: Record<TimelineNodeState, string> = {
  PASSED: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'border-destructive/40 bg-destructive/10 text-destructive',
  PENDING: 'border-border bg-muted text-muted-foreground',
};

/** Read by screen readers in place of the colour, so the state is never colour-only. */
export const TIMELINE_STATE_LABELS: Record<TimelineNodeState, string> = {
  PASSED: 'Passed',
  REJECTED: 'Not selected',
  PENDING: 'Pending',
};
