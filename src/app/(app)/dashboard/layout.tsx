import { RequireRole } from '@/features/auth/components/RequireRole';
import { PIPELINE_USER_ROLES } from '@/features/pipeline/permissions';

/** Layout for recruitment dashboard, restricted to recruiters. */
export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return <RequireRole allow={PIPELINE_USER_ROLES}>{children}</RequireRole>;
}
