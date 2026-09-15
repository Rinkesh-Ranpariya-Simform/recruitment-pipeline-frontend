'use client';

import Link from 'next/link';
import { FileQuestionIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Shown when the role doesn't exist, inside the app chrome.
 *
 * Not `notFound()` or Next's `not-found.tsx`: the route resolved fine, it's the
 * requisition that is gone. Keeping the nav in place leaves the user a way back
 * to the list.
 */
export function RoleNotFound() {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <FileQuestionIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Role not found</h1>
        <p className="text-sm text-muted-foreground">
          This role doesn&apos;t exist, or it was removed.
        </p>
      </div>
      <Button variant="outline" size="sm" render={<Link href="/roles" />}>
        Back to roles
      </Button>
    </section>
  );
}
