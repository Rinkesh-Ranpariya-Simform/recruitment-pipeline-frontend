import { RequireRole } from '@/features/auth/components/RequireRole';

/**
 * Recruiter-only, closing a gap the roles feature noted and left open.
 *
 * `/pipeline` was reachable by any authenticated user who typed the URL —
 * tolerable while every account was staff, not once candidates exist.
 *
 * A rendering decision, not a security control.
 */
export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={['RECRUITER']}>{children}</RequireRole>;
}
