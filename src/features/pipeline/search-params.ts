import type { ReadonlyURLSearchParams } from 'next/navigation';

import type { PipelineStage } from './types';

/**
 * The `/pipeline` URL is the source of truth for both filters, so a board a
 * recruiter is looking at is a board they can send to someone. Reading and
 * writing it lives here so the filter bar, the stage cards and the dashboard's
 * links cannot disagree about the format — the same arrangement as
 * `features/audit/search-params.ts` and `features/roles/search-params.ts`.
 */

export interface PipelineSearchParams {
  roleId: number | undefined;
  stage: PipelineStage | undefined;
}

/**
 * The four stages, in the order the board offers them.
 *
 * **This is display order, not a transition graph** (FE-8). It says which
 * columns exist and in what sequence a recruiter reads them; it says nothing
 * about which moves are legal. Legality comes from the API's own
 * `details.allowed`, and there is no map in this feature that claims otherwise.
 *
 * It exists here only so the `stage` filter select has options and so an
 * unrecognised `?stage=` can be rejected. The board itself takes its order from
 * the API's array (FR-3.2), which is densified and already correct.
 */
const STAGES: ReadonlyArray<PipelineStage> = ['APPLIED', 'SCREEN', 'INTERVIEW', 'OFFER'];

/**
 * Whether a string is a stage this client recognises.
 *
 * Exported because the filter select needs the same check — base-ui's
 * `onValueChange` hands back a widened `string | null`, and a second copy of
 * the list would eventually disagree with this one.
 */
export const isPipelineStage = (value: string | null): value is PipelineStage => {
  return value !== null && (STAGES as ReadonlyArray<string>).includes(value);
};

/** The order the stage select offers, which is the order the board reads in. */
export const PIPELINE_STAGES = STAGES;

/**
 * Sanitises the query string before anything is requested (VAL-4, EC-10).
 *
 * An unrecognised `stage` becomes no filter and a non-positive `roleId` is
 * dropped, so `?stage=BANANA&roleId=-1` from a stale bookmark renders the
 * **unfiltered board** rather than the 400 the API would rightly answer —
 * **the client does not forward garbage to earn an error it can predict.**
 * Matching `parseRolesSearchParams` and `parseAuditSearchParams`.
 *
 * There is no `page` here: `GET /api/pipeline` is unpaginated because its
 * response is bounded by roles rather than by candidates (XBE-8, FR-3.9).
 */
export const parsePipelineSearchParams = (
  searchParams: ReadonlyURLSearchParams,
): PipelineSearchParams => {
  const rawRoleId = Number(searchParams.get('roleId'));
  const rawStage = searchParams.get('stage');

  return {
    roleId: Number.isInteger(rawRoleId) && rawRoleId >= 1 ? rawRoleId : undefined,
    stage: isPipelineStage(rawStage) ? rawStage : undefined,
  };
};

/**
 * Builds a `/pipeline` href. Both parameters are omitted at their defaults, so
 * the unfiltered board is a bare `/pipeline` rather than `/pipeline?roleId=`
 * — matching `buildRolesHref` and `buildAuditHref`.
 *
 * Used by the filter bar, by every stage card's drill-down link, and by the
 * dashboard's tiles and stage strip, so all four produce byte-identical URLs
 * for the same board.
 */
export const buildPipelineHref = ({ roleId, stage }: Partial<PipelineSearchParams>): string => {
  const params = new URLSearchParams();

  if (roleId && roleId > 0) {
    params.set('roleId', String(roleId));
  }

  if (stage) {
    params.set('stage', stage);
  }

  const query = params.toString();

  return query ? `/pipeline?${query}` : '/pipeline';
};

/**
 * Whether anything is filtering the board. Drives the Clear filters button and
 * the choice between the two empty states — telling a recruiter "no candidates
 * match these filters" when they have set none is the one thing an empty board
 * must not say.
 */
export const hasActivePipelineFilters = ({ roleId, stage }: PipelineSearchParams): boolean => {
  return roleId !== undefined || stage !== undefined;
};
