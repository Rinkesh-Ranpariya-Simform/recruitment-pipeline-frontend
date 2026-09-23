'use client';

import { useState } from 'react';
import { StarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/** 1–5, the API's bounds, as the array the control renders from. */
const STARS = [1, 2, 3, 4, 5] as const;

interface StarRatingProps {
  /** `0` means unselected. The form never submits it — the schema's `min(1)` refuses. */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Wired to the field's label, so the group announces what it is rating. */
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/**
 * The rating control: five buttons, hand-rolled, **emitting integers 1–5**
 * (FR-3.3, D-2).
 *
 * `onChange` is typed `(value: number) => void`, so **this control cannot emit a
 * string, a `0` from a click, or a `4.5`** (FE-5, XBE-3). That is the point of
 * building it rather than taking a rating library: the API refuses a coerced
 * `"4"`, and a control that could produce one would turn a contract into a
 * runtime surprise. It is still not the control — AC-M05 fires `0` and `4.5`
 * from the console and gets a `400` either way (AZ-4).
 *
 * **A real `radiogroup`, not five buttons that look like one.** Arrow keys move
 * the selection within 1–5, `Space`/`Enter` select, each star carries
 * `aria-checked`, and the group's value is announced as "{n} of 5" — so the
 * rating is reachable and legible without a pointer or a screen (EC-17).
 * Roving `tabIndex`: one stop for the whole group, as a radio group should be,
 * rather than five stops on the way to the notes field.
 *
 * **Hover is a preview and never a value** (state matrix). Moving the pointer
 * across the stars and leaving without clicking changes nothing, which matters
 * because the alternative is a rating nobody chose. The preview is local state
 * and does not re-render the form (PERF-7).
 *
 * The read-only rendering is `<RatingDisplay>`, a **separate** component —
 * this one is never rendered disabled on a recruiter's screen. A disabled
 * control is still a control, and their screen should contain none (FE-6).
 */
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
