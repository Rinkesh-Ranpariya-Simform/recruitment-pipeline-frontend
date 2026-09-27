import type { RoleStatus } from '@/features/roles/types';

/** Pipeline feature types and API contracts. */

/** Re-exported stage and outcome types. */
export type { ApplicationStatus, PipelineStage } from '@/features/applications/types';

import type { ApplicationStatus, PipelineStage } from '@/features/applications/types';

/** Represents candidate metrics for a specific role and stage cell. */
export interface PipelineStageCell {
  stage: PipelineStage;
  candidateCount: number;
  avgDaysInStage: number | null;
  maxDaysInStage: number | null;
}

/** Represents a role and its pipeline stages on the board. */
export interface PipelineRole {
  id: number;
  title: string;
  status: RoleStatus;
  totalActive: number;
  stages: Array<PipelineStageCell>;
}

/** Response payload for the pipeline board endpoint. */
export interface PipelineBoardResponse {
  roles: Array<PipelineRole>;
}

/** Dashboard headline summary metrics. */
export interface PipelineSummary {
  openRoles: number;
  totalApplicants: number;
  activeApplicants: number;
  offers: number;
  hired: number;
  rejected: number;
  interviews: number;
}

/** Response payload for the pipeline summary endpoint. */
export interface PipelineSummaryResponse {
  summary: PipelineSummary;
}

/** Response returned from stage advancement and outcome changes. */
export interface PipelineApplication {
  id: number;
  status: ApplicationStatus;
  currentStage: PipelineStage;
  stageEnteredAt: string;
  role: { id: number; title: string };
}

/** Response returned when overriding an application stage. */
export interface StageOverride {
  id: number;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  reason: string;
  skipped: number;
  createdAt: string;
  performedBy: { id: number; name: string };
}

/** Mutation payload for stage advancement and outcome changes. */
export interface PipelineApplicationResponse {
  application: PipelineApplication;
}

/** Mutation payload for stage overrides. */
export interface StageOverrideResponse {
  application: PipelineApplication;
  override: StageOverride;
}

/** Terminal application outcome statuses. */
export type OutcomeStatus = Extract<ApplicationStatus, 'HIRED' | 'REJECTED'>;
