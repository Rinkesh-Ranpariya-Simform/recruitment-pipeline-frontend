import { PencilIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import { RatingDisplay } from './RatingDisplay';
import type { Feedback } from '../types';

interface FeedbackCardProps {
  entry: Feedback;
  /** Indicates whether this assessment belongs to the current user. */
  isOwn: boolean;
  /** Absent for a recruiter, and for a round nobody may write on. */
  onEdit?: (() => void) | undefined;
}

/** Displays a single feedback assessment card with interviewer details, rating, and notes. */
export const FeedbackCard: React.FC<FeedbackCardProps> = ({ entry, isOwn, onEdit }) => {
  const wasEdited = entry.updatedAt !== entry.createdAt;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium break-words">{entry.interviewer.name}</p>
              {isOwn && <Badge variant="secondary">Your feedback</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              <time dateTime={entry.createdAt} title={formatAbsolute(entry.createdAt)}>
                {formatRelative(entry.createdAt)}
              </time>
              {wasEdited && (
                <>
                  {' · '}
                  <time dateTime={entry.updatedAt} title={formatAbsolute(entry.updatedAt)}>
                    edited {formatRelative(entry.updatedAt)}
                  </time>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <RatingDisplay rating={entry.rating} />
            {/* Only on the author's own card, and only where a form exists at
                all. It scrolls to the form rather than opening a second one —
                the form is already a create-or-edit and is already prefilled. */}
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <PencilIcon className="size-4" aria-hidden="true" />
                Edit
              </Button>
            )}
          </div>
        </div>

        <p className="text-sm whitespace-pre-wrap break-words">{entry.notes}</p>
      </CardContent>
    </Card>
  );
};
