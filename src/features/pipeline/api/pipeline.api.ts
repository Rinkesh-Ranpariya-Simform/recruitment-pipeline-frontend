import { apiFetch } from '@/lib/api';
import type { OutcomeValues, OverrideValues } from '@/lib/schemas/pipeline';
import type { PipelineSearchParams } from '../search-params';
import type {
  PipelineApplicationResponse,
  PipelineBoardResponse,
  PipelineStage,
  PipelineSummaryResponse,
  StageOverrideResponse,
} from '../types';

/**
 * Every pipeline request the client makes — **five functions, one per
 * endpoint, and no more** (FE-2).
 *
 * This is the only file that names an `/api/pipeline` or
 * `/api/applications/:id/…` path, and no component assembles a path or a query
 * string itself (API-1, API-2).
 *
 * There is deliberately **no wrapper for `GET /api/candidates`** (API-6). The
 * drill-down list calls it, but that endpoint belongs to the candidate-access
 * feature and this feature will import its api module once it exists — a second
 * wrapper for one endpoint is how two callers end up sending two different
 * query strings to it.
 */

/**
 * The board: counts and ageing per role per stage.
 *
 * Both parameters are omitted at their defaults so the request matches the URL
 * the recruiter sees (API-3). `parsePipelineSearchParams` has already sanitised
 * them, so the 400s the API can return should be unreachable from here.
 *
 * `page` is never sent, because this endpoint is not paginated (XBE-8): its
 * response is one cell per role per stage, bounded by roles rather than by the
 * candidates behind them.
 */
export const getPipeline = ({
  roleId,
  stage,
}: Partial<PipelineSearchParams> = {}): Promise<PipelineBoardResponse> => {
  const params = new URLSearchParams();

  if (roleId && roleId > 0) {
    params.set('roleId', String(roleId));
  }

  if (stage) {
    params.set('stage', stage);
  }

  const query = params.toString();

  return apiFetch<PipelineBoardResponse>(`/api/pipeline${query ? `?${query}` : ''}`);
};

/**
 * The dashboard headline. Takes no parameters — there is nothing to filter, and
 * the six numbers it returns are the whole of it (XBE-9).
 */
export const getPipelineSummary = (): Promise<PipelineSummaryResponse> => {
  return apiFetch<PipelineSummaryResponse>('/api/pipeline/summary');
};

/**
 * Advances an application one stage.
 *
 * `toStage` is the single stage the menu offered, and the menu derived it from
 * the API's own answers — **this client owns no copy of the stage graph**
 * (FE-8, FR-5.2). An illegal move is a `409 INVALID_STAGE_TRANSITION` whose
 * `details.allowed` is where the legal ones come from.
 *
 * There is no `fromStage` field: the API reads the current stage from the row
 * and guards the write on it, which is what makes the conflict case detectable
 * at all.
 */
export const moveStage = (
  applicationId: number,
  toStage: PipelineStage,
): Promise<PipelineApplicationResponse> => {
  return apiFetch<PipelineApplicationResponse>(`/api/applications/${applicationId}/stage`, {
    method: 'PATCH',
    body: { toStage },
  });
};

/**
 * Skips a stage, on the record.
 *
 * `reason` is required by the API and by `overrideSchema`; the client's minimum
 * is UX and the `400` is the control (XBE-5, AZ-5). A `201` carries both the
 * moved application and the override row it created, so the recruiter sees the
 * record their reason produced rather than being told one was written.
 */
export const overrideStage = (
  applicationId: number,
  values: OverrideValues,
): Promise<StageOverrideResponse> => {
  return apiFetch<StageOverrideResponse>(`/api/applications/${applicationId}/stage-override`, {
    method: 'POST',
    body: values,
  });
};

/**
 * Closes an application as hired or rejected.
 *
 * `reason` is optional and is omitted rather than sent as an empty string when
 * the recruiter left it blank — an empty reason is not a reason, and the API's
 * own field is optional for the same reason (VAL-5).
 *
 * **This does not move the stage.** The API leaves `currentStage` where it was
 * on purpose: "rejected at Screen" and "rejected at Offer" are different
 * outcomes, and the response reflects that.
 */
export const setOutcome = (
  applicationId: number,
  { status, reason }: OutcomeValues,
): Promise<PipelineApplicationResponse> => {
  return apiFetch<PipelineApplicationResponse>(`/api/applications/${applicationId}/outcome`, {
    method: 'PATCH',
    body: reason ? { status, reason } : { status },
  });
};
