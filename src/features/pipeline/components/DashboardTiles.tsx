'use client';

import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { buildPipelineHref } from '../search-params';
import type { PipelineSummary } from '../types';

interface Tile {
  key: keyof PipelineSummary;
  label: string;
  href: string;
}

/**
 * The seven tiles, in reading order (FR-2.2, revised by the interviews
 * feature).
 *
 * **The Interviews tile is the seventh**, added once the API began sending
 * `summary.interviews` — the count of SCHEDULED rounds. It reverses the note
 * that used to stand here: the field's absence was a build-order fact, not a
 * product decision, and the walkthrough's dashboard has always shown this tile.
 * It links to `/interviews`, the recruiter's list, rather than into the board —
 * the rounds it counts are not a board column.
 *
 * Every tile links into the board (FR-2.5): a number nobody can act on is
 * decoration. `Offers` deep-links to the Offer column, since that is the one
 * tile with an exact board equivalent; the rest land on the unfiltered board,
 * because "hired" and "rejected" are not stages and the board shows live
 * candidates only.
 *
 * A module-level constant, built once rather than per render (PERF-8).
 */
const TILES: ReadonlyArray<Tile> = [
  { key: 'openRoles', label: 'Open roles', href: '/roles?status=OPEN' },
  { key: 'totalApplicants', label: 'Total applicants', href: buildPipelineHref({}) },
  { key: 'activeApplicants', label: 'Active', href: buildPipelineHref({}) },
  { key: 'offers', label: 'Offers', href: buildPipelineHref({ stage: 'OFFER' }) },
  { key: 'hired', label: 'Hired', href: buildPipelineHref({}) },
  { key: 'rejected', label: 'Rejected', href: buildPipelineHref({}) },
  { key: 'interviews', label: 'Interviews', href: '/interviews' },
];

interface DashboardTilesProps {
  summary: PipelineSummary;
}

/** The headline row. Seven numbers, each a link to what it summarises. */
export const DashboardTiles: React.FC<DashboardTilesProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      {TILES.map((tile) => (
        <Link
          key={tile.key}
          href={tile.href}
          className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Card className="gap-1 p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
            <p className="text-2xl font-semibold tabular-nums">{summary[tile.key]}</p>
            <p className="text-xs text-muted-foreground">{tile.label}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
};

/** The tiles' loading shape — seven placeholders in the same grid. */
export const DashboardTilesSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((tile) => (
        <div key={tile} className="h-20 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
};
