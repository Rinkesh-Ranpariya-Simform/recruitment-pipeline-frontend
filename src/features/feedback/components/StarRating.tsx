'use client';

import { useState } from 'react';
import { StarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Available star values (1 to 5). */
const STARS = [1, 2, 3, 4, 5] as const;

interface StarRatingProps {
  /** Current rating value (0 represents unselected). */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Accessibility label ID for the rating group. */
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/** Interactive star rating input supporting keyboard navigation and hover preview. */
export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  disabled = false,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  // What the stars show. The hover preview never becomes the value.
  const shown = hovered ?? value;

  const move = (delta: number) => {
    if (disabled) {
      return;
    }

    // From unselected, the first arrow press lands on 1 rather than jumping to
    // the middle. Clamped both ends, so the value can never leave the API's
    // bounds however long a key is held.
    const next = Math.min(5, Math.max(1, (value === 0 ? 0 : value) + delta));
    onChange(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerLeave={() => setHovered(null)}
      className="flex w-fit items-center gap-1"
    >
      {STARS.map((star) => {
        const filled = star <= shown;
        const checked = star === value;

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${star} of 5`}
            disabled={disabled}
            // Roving tabindex: the selected star is the group's tab stop, or the
            // first star while nothing is selected.
            tabIndex={checked || (value === 0 && star === 1) ? 0 : -1}
            onClick={() => onChange(star)}
            onPointerEnter={() => !disabled && setHovered(star)}
            onFocus={() => !disabled && setHovered(star)}
            onBlur={() => setHovered(null)}
            className={cn(
              'rounded-md p-0.5 transition-colors',
              'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            )}
          >
            <StarIcon
              aria-hidden="true"
              className={cn(
                'size-6 transition-colors',
                filled ? 'fill-primary text-primary' : 'text-muted-foreground',
              )}
            />
          </button>
        );
      })}

      {/* The value in words, for anyone who cannot see the stars — and a live
          region, so moving the selection with the arrow keys is announced. */}
      <span className="sr-only" aria-live="polite">
        {value === 0 ? 'No rating chosen' : `${value} of 5`}
      </span>
    </div>
  );
};
