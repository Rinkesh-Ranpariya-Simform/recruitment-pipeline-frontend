import { RequireRole } from '@/features/auth/components/RequireRole';
import { CANDIDATES_USER_ROLES } from '@/features/candidates/permissions';

/** Layout for candidate routes, accessible to recruiters and interviewers. */
export default function CandidatesLayout({ children }: LayoutProps<'/candidates'>) {
  return <RequireRole allow={CANDIDATES_USER_ROLES}>{children}</RequireRole>;
}
