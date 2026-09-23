import { StarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const STARS = [1, 2, 3, 4, 5] as const;

interface RatingDisplayProps {
  rating: number;
}

/**
 * A rating, read-only (FR-2.4).
 *
 * **Stars and a number, never stars alone.** Stars are scannable across a panel
 * of three; the number is what carries the value to anyone who cannot see them,
 * and to anyone comparing two rounds. Both render for everyone rather than one
 * being a fallback for the other.
 *
 * **This is a separate component from `<StarRating>`, not that one disabled**
 * (FE-6). A disabled control is still a control — it appears in the tab order's
 * accessibility tree as a thing that could have been operated — and a
 * recruiter's screen should contain none of those, because a recruiter may not
 * write feedback at all. Here there are no buttons: five icons and a string.
 */
export const RatingDisplay: React.FC<RatingDisplayProps> = ({ rating }) => {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {STARS.map((star) => (
          <StarIcon
            key={star}
            className={cn(
              'size-4',
              star <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/40',
            )}
          />
        ))}
      </span>
      <span className="text-sm font-medium tabular-nums">{rating}/5</span>
    </span>
  );
};
