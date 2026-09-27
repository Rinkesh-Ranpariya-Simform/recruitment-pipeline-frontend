import { StarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const STARS = [1, 2, 3, 4, 5] as const;

interface RatingDisplayProps {
  rating: number;
}

/** Read-only rating component displaying star icons and numerical score out of 5. */
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
