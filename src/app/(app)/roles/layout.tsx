import { RequireRole } from '@/features/auth/components/RequireRole';
import { ROLES_USER_ROLES } from '@/features/roles/permissions';

/**
 * Gates `/roles` and `/roles/[roleId]` to recruiters in one place, rather than
 * each page repeating the guard. An interviewer who types either URL gets the
 * app's 404.
 *
 * The backend refuses those reads with a 403 anyway — this only keeps a user
 * out of a page that could never work for them.
 */
export default function RolesLayout({ children }: LayoutProps<'/roles'>) {
  return <RequireRole allow={ROLES_USER_ROLES}>{children}</RequireRole>;
}
