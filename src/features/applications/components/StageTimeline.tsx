'use client';

import Link from 'next/link';
import { CheckIcon, ChevronRightIcon, ClockIcon, XIcon } from 'lucide-react';

import { formatAbsolute } from '@/lib/format-date';
import { cn } from 'cn';
import { TIMELINE_STATE_CLASSES, TIMELINE_STATE_LABELS, timelineNodeLabel } from '../labels';
import type { TimelineNode, TimelineNodeState } from '../types';

/**
 * The stage transition timeline:
 *
 * ```
 * Applied → Screened (phone screen) → Interview (technical) → Interview (system design) → Not selected
 * ```
 *
 * **One component, both audiences.** A candidate sees it on their application
 * card and a recruiter sees it at the top of an application's detail page, and
 * they see the same nodes in the same order with the same colours — because the
 * backend builds both from one function (`backend/.../timeline.ts`). Two
 * components would eventually tell the two sides different stories about one
 * process, which is the failure the brief opens with.
 *
 * The one difference is `roundBasePath`, and it is a routing fact rather than a
 * disclosure one: a recruiter has a round page to open, and a candidate does
 * not. **Nothing in a node is withheld from either** — see `TimelineNode`, which
 * has no assessor, rating or note to withhold.
 *
 * It is a path rather than a boolean because a round's page is nested under the
 * process it belongs to — `/interviews/:applicationId/:interviewId` — so this
 * component cannot build the href from a node alone. Passing the base in means
 * a caller that has no round route to offer simply does not pass one, and there
 * is no way to render a link to half a path.
 *
 * ## Accessibility
 *
 * An ordered list, because the order is the meaning. Each node carries an icon
 * and a visually-hidden state word, so **the green/red distinction is never
 * carried by colour alone** — it survives a screen reader, a monochrome print
 * and the eight percent of men who would otherwise read the two ends of this
 * timeline as the same grey.
 *
 * The arrows are `aria-hidden`: the list already says "3 of 5" to a screen
 * reader, and a chevron announced between every pair is noise.
 */

const STATE_ICONS: Record<TimelineNodeState, typeof CheckIcon> = {
  PASSED: CheckIcon,
  REJECTED: XIcon,
  PENDING: ClockIcon,
};

interface StageTimelineProps {
  nodes: Array<TimelineNode>;
  /**
   * Recruiters only: the parent of a round's page, so each round node becomes a
   * link to `${roundBasePath}/${node.interviewId}`. Omitted, the nodes are text.
   */
  roundBasePath?: string;
  className?: string;
}

interface TimelineNodeChipProps {
  node: TimelineNode;
  roundBasePath: string | undefined;
}

const TimelineNodeChip: React.FC<TimelineNodeChipProps> = ({ node, roundBasePath }) => {
  const { label, detail } = timelineNodeLabel(node);
  const Icon = STATE_ICONS[node.state] ?? ClockIcon;

  const body = (
    <>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="font-medium">{label}</span>
      {detail && <span className="opacity-80">({detail})</span>}
      <span className="sr-only">
        {' — '}
        {TIMELINE_STATE_LABELS[node.state] ?? node.state}
        {node.at ? `, ${formatAbsolute(node.at)}` : ''}
      </span>
    </>
  );

  const className = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors',
    TIMELINE_STATE_CLASSES[node.state] ?? TIMELINE_STATE_CLASSES.PENDING,
  );

  // `title` carries the timestamp for a mouse; the `sr-only` span above carries
  // it for everyone else. A visible date on every chip would make the row
  // unreadable at five nodes.
  if (roundBasePath !== undefined && node.interviewId !== null) {
    return (
      <Link
        href={`${roundBasePath}/${node.interviewId}`}
        title={node.at ? formatAbsolute(node.at) : 'No date set'}
        className={cn(
          className,
          'hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:hover:brightness-125',
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <span title={node.at ? formatAbsolute(node.at) : undefined} className={className}>
      {body}
    </span>
  );
};

export const StageTimeline: React.FC<StageTimelineProps> = ({
  nodes,
  roundBasePath,
  className,
}) => {
  if (nodes.length === 0) {
    return null;
  }

  return (
    // `flex-wrap`, not a horizontal scroller: five nodes do not fit on a phone
    // and a timeline you have to drag sideways is a timeline nobody reads to
    // the end of. Wrapping keeps the whole sequence on screen at any width.
    <ol
      aria-label="Application progress"
      className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-2', className)}
    >
      {nodes.map((node, index) => (
        <li key={node.key} className="flex items-center gap-1.5">
          {index > 0 && (
            <ChevronRightIcon
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <TimelineNodeChip node={node} roundBasePath={roundBasePath} />
        </li>
      ))}
    </ol>
  );
};
