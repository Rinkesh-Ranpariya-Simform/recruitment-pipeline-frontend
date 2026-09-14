'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from 'cn';

/**
 * Navigation is **identical for both roles**. No route in this app is
 * role-gated, so no link is conditional — role selects a landing route and fills
 * the chip below, and gates nothing.
 */
const NAV_LINKS = [
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/my-interviews', label: 'My interviews' },
];

function AppChrome({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoggingOut } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 p-4">
          <span className="font-semibold">Recruitment Pipeline</span>

          <Separator orientation="vertical" className="h-5" />

          <nav className="flex items-center gap-1" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <Button
                key={link.href}
                variant="ghost"
                size="sm"
                render={<Link href={link.href} />}
                className={cn(pathname === link.href && 'bg-muted text-foreground')}
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                {link.label}
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            {user && <Badge variant="secondary">{user.role}</Badge>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void logout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out…' : 'Log out'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-6">{children}</main>
    </div>
  );
}

/**
 * The authenticated shell. The guard lives here so no page repeats it.
 *
 * `<RequireAuth>` is a UX affordance — the backend re-authorizes every request
 * regardless of what this layout decides to render.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppChrome>{children}</AppChrome>
    </RequireAuth>
  );
}
