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

/** Pipeline API client functions for fetching board data, summaries, and stage updates. */

/** Fetches the pipeline board matrix, optionally filtered by role and/or stage. */
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

/** Fetches headline summary metrics for the recruitment dashboard. */
export const getPipelineSummary = (): Promise<PipelineSummaryResponse> => {
  return apiFetch<PipelineSummaryResponse>('/api/pipeline/summary');
};

/** Advances an application to the specified target stage. */
export const moveStage = (
  applicationId: number,
  toStage: PipelineStage,
): Promise<PipelineApplicationResponse> => {
  return apiFetch<PipelineApplicationResponse>(`/api/applications/${applicationId}/stage`, {
    method: 'PATCH',
    body: { toStage },
  });
};

/** Overrides an application's pipeline stage with a required explanation reason. */
export const overrideStage = (
  applicationId: number,
  values: OverrideValues,
): Promise<StageOverrideResponse> => {
  return apiFetch<StageOverrideResponse>(`/api/applications/${applicationId}/stage-override`, {
    method: 'POST',
    body: values,
  });
};

/** Updates an application's terminal outcome (HIRED or REJECTED) with an optional reason. */
export const setOutcome = (
  applicationId: number,
  { status, reason }: OutcomeValues,
): Promise<PipelineApplicationResponse> => {
  return apiFetch<PipelineApplicationResponse>(`/api/applications/${applicationId}/outcome`, {
    method: 'PATCH',
    body: reason ? { status, reason } : { status },
  });
};
