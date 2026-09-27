'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  FileTextIcon,
  GaugeIcon,
  GitBranchIcon,
  LogOutIcon,
  ScrollTextIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { User, UserRole } from '@/features/auth/types';
import { cn } from 'cn';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}
interface NavSection {
  label: string;
  links: Array<NavLink>;
}

// Navigation link definitions
const DASHBOARD: NavLink = { href: '/dashboard', label: 'Dashboard', icon: GaugeIcon };
const PIPELINE: NavLink = { href: '/pipeline', label: 'Pipeline', icon: GitBranchIcon };
const ROLES: NavLink = { href: '/roles', label: 'Roles', icon: BriefcaseIcon };
const MY_INTERVIEWS: NavLink = {
  href: '/my-interviews',
  label: 'My interviews',
  icon: ClipboardListIcon,
};
const INTERVIEWS: NavLink = { href: '/interviews', label: 'Interviews', icon: CalendarDaysIcon };
const APPLICATIONS: NavLink = {
  href: '/applications',
  label: 'Applications',
  icon: FileTextIcon,
};
const JOBS: NavLink = { href: '/jobs', label: 'Jobs', icon: BriefcaseIcon };
const MY_APPLICATIONS: NavLink = {
  href: '/my-applications',
  label: 'My applications',
  icon: FileTextIcon,
};
const CANDIDATES: NavLink = { href: '/candidates', label: 'Candidates', icon: UsersIcon };
const AUDIT: NavLink = { href: '/audit', label: 'Audit', icon: ScrollTextIcon };
const PROFILE: NavLink = { href: '/profile', label: 'Profile', icon: UserIcon };

/** Common account nav section for all roles. */
const ACCOUNT_SECTION: NavSection = { label: 'Account', links: [PROFILE] };

/** Navigation sections and routes available for each user role in the sidebar. */
const NAV_SECTIONS: Record<UserRole, Array<NavSection>> = {
  RECRUITER: [
    // Recruiter hiring workflow navigation
    { label: 'Hiring', links: [DASHBOARD, PIPELINE, ROLES, CANDIDATES, APPLICATIONS, INTERVIEWS] },
    { label: 'Records', links: [AUDIT] },
    ACCOUNT_SECTION,
  ],
  // Interviewer navigation
  INTERVIEWER: [{ label: 'Interviews', links: [MY_INTERVIEWS, CANDIDATES] }, ACCOUNT_SECTION],
  CANDIDATE: [{ label: 'Jobs', links: [JOBS, MY_APPLICATIONS] }, ACCOUNT_SECTION],
};

/** Determines if a navigation link matches the current active route or subroute. */
const isActive = (pathname: string, href: string): boolean => {
  return pathname === href || pathname.startsWith(`${href}/`);
};

/** Extracts user initials for avatar display. */
const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

interface AvatarProps {
  user: User;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ user, className }) => {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground',
        className,
      )}
    >
      {initialsOf(user.name)}
    </span>
  );
};

interface SidebarProps {
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const pathname = usePathname();

  return (
    // Collapses to an icon rail below `md` rather than disappearing: every
    // destination stays reachable on a phone without introducing a drawer.
    <aside className="sticky top-0 flex h-svh w-16 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:w-64">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b px-4">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground"
        >
          RP
        </span>
        <span className="hidden truncate font-semibold md:inline">Recruitment Pipeline</span>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3" aria-label="Main">
        {NAV_SECTIONS[user.role].map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <p className="hidden px-3 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase md:block">
              {section.label}
            </p>

            {section.links.map((link) => {
              const active = isActive(pathname, link.href);
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    'justify-center md:justify-start',
                    'focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none',
                    active
                      ? 'bg-sidebar-primary/15 font-medium text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon
                    className={cn('size-4 shrink-0', active && 'text-sidebar-primary')}
                    aria-hidden="true"
                  />
                  <span className="hidden truncate md:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};

interface UserMenuProps {
  user: User;
}

const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const { logout, isLoggingOut } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`Account menu for ${user.name}`}
      >
        <Avatar user={user} />
        <span className="hidden font-medium sm:inline">{user.name}</span>
      </DropdownMenuTrigger>

      {/* The popup is anchor-width by default; the identity block needs more
          room than the trigger has. */}
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-2.5 p-1.5">
          <Avatar user={user} className="size-9 text-sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground" title={user.email}>
              {user.email}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled={isLoggingOut} onClick={() => void logout()}>
          <LogOutIcon aria-hidden="true" />
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface AppChromeProps {
  children: React.ReactNode;
}

/** Authenticated layout shell containing sidebar navigation and header controls. */
const AppChrome: React.FC<AppChromeProps> = ({ children }) => {
  const { user } = useAuth();

  // `RequireAuth` renders its own loading and anonymous states, so a user is
  // always present by the time this runs.
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-svh">
      <Sidebar user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b bg-background px-4 md:px-8">
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppChrome>{children}</AppChrome>
    </RequireAuth>
  );
}
