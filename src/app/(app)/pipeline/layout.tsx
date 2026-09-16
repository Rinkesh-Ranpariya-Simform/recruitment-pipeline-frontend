import { RequireRole } from '@/features/auth/components/RequireRole';

/**
 * Recruiter-only, closing a gap the roles feature noted and left open.
 *
 * `/pipeline` was reachable by any authenticated user who typed the URL. That
 * was tolerable while every account was staff; with candidates in the system it
 * means an applicant rendering the recruiter's pipeline shell, so it is closed
 * here.
 *
 * As ever: a rendering decision, not a security control. The aggregates this
 * page will eventually show are recruiter-scoped on the server.
 */
export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={['RECRUITER']}>{children}</RequireRole>;
}
