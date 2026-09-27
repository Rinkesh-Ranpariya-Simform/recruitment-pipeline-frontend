import { RequireRole } from '@/features/auth/components/RequireRole';
import { AUDIT_USER_ROLES } from '@/features/audit/permissions';

/** Layout for audit log routes, restricting access to recruiters. */
export default function AuditLayout({ children }: LayoutProps<'/audit'>) {
  return <RequireRole allow={AUDIT_USER_ROLES}>{children}</RequireRole>;
}
