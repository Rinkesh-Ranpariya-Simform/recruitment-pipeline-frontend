import type { UserRole } from '@/features/auth/types';

/** User roles authorized to view and interact with the pipeline board and dashboard. */
export const PIPELINE_USER_ROLES: ReadonlyArray<UserRole> = ['RECRUITER'];
