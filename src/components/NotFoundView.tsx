import Link from 'next/link';
import { FileQuestionIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Shared 404 view for unmatched routes and unauthorized access attempts. */
export const NotFoundView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <FileQuestionIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This page doesn&apos;t exist, or the link that brought you here is out of date.
        </p>
      </div>
      <Button variant="outline" size="sm" render={<Link href="/" />}>
        Go back
      </Button>
    </div>
  );
};
