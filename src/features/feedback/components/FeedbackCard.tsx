import { PencilIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import { RatingDisplay } from './RatingDisplay';
import type { Feedback } from '../types';

interface FeedbackCardProps {
  entry: Feedback;
  /** Marks this card as the signed-in interviewer's own. **Display only** (FR-2.3). */
  isOwn: boolean;
  /** Absent for a recruiter, and for a round nobody may write on. */
  onEdit?: (() => void) | undefined;
}

/**
 * One assessment (FR-2.2).
 *
 * It names its **author** — which is the whole point of reading a panel's notes
 * and is the disclosure the interviews feature deliberately withheld from a
 * round payload so that it happens here, once, where it is specified.
 *
 * **"edited {time}" renders when `updatedAt` differs from `createdAt`.** A
 * silently revised assessment is worse than a visibly revised one: the audit
 * trail records every edit, and a reader of this card should not have to consult
 * it to learn that the rating in front of them is not the first one.
 *
 * **The notes are a text node with `whitespace-pre-wrap`** (FE-9, SEC-4). They
 * are the only free text in this app written by one user and read by another,
 * which makes this the one place where rendering HTML would be a real injection
 * path. React escapes the value; there is no `dangerouslySetInnerHTML` and no
 * markdown renderer anywhere in this feature, and `<script>alert(1)</script>`
 * renders as those characters. Line breaks and indentation survive, because that
 * is what people actually use.
 *
 * **Nothing is truncated** (FR-2.7). An assessment half-read is worse than a
 * long card, and a "show more" on somebody's judgement of a person invites
 * skipping it.
 *
 * There is no delete control, for anybody. The API has no such route.
 */
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
