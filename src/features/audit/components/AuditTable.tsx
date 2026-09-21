'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatAbsoluteUtc, formatRelative } from '@/lib/format-date';
import { AuditActionBadge } from './AuditActionBadge';
import { AuditMetadata } from './AuditMetadata';
import { entityLabel } from '../labels';
import type { AuditEntry } from '../types';

/** Placeholder rows shown while the first page loads. */
const SKELETON_ROWS = 8;

const AuditTableHead: React.FC = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="whitespace-nowrap">When</TableHead>
        <TableHead className="whitespace-nowrap">Action</TableHead>
        <TableHead className="whitespace-nowrap">Entity</TableHead>
        <TableHead className="whitespace-nowrap">Actor</TableHead>
        <TableHead className="w-full">Details</TableHead>
      </TableRow>
    </TableHeader>
  );
};

/**
 * The loading state: same header, columns and row height as the real table, so
 * nothing shifts when the data lands.
 */
export const AuditTableSkeleton: React.FC = () => {
  return (
    <Table>
      <AuditTableHead />
      <TableBody>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell className="py-3">
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-5 w-28 rounded-4xl" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-4 w-56 max-w-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

interface AuditTableProps {
  entries: Array<AuditEntry>;
}

/**
 * When · Action · Entity · Actor · Details (FR-2.2).
 *
 * **The rows render in the order the API returned them.** The server orders
 * `createdAt desc, id desc`, and the client does not re-sort and has no
 * tiebreak of its own — a second sort here would be a second source of truth,
 * and two entries written in one transaction share a `createdAt` to the
 * millisecond often enough for it to matter (FR-2.1, XBE-3, EC-11).
 *
 * **No row is clickable and no row has an action.** Unlike `RolesTable` there
 * is nowhere to navigate: an audit entry is not a resource with a page, its
 * `entityId` deliberately has no referential integrity and may name a deleted
 * row, and there is no endpoint that edits or deletes one (XBE-11, FE-6).
 * Entity links arrive with the candidate-access feature (D-6); until then the
 * entity renders as text.
 */
export const AuditTable: React.FC<AuditTableProps> = ({ entries }) => {
  return (
    <Table>
      <AuditTableHead />
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id} className="hover:bg-transparent">
            {/* Relative for scanning, absolute UTC in the tooltip for
                disputing. A trace needs both (FR-2.3). */}
            <TableCell className="py-3 align-top whitespace-nowrap text-muted-foreground">
              <time dateTime={entry.createdAt} title={formatAbsoluteUtc(entry.createdAt)}>
                {formatRelative(entry.createdAt)}
              </time>
            </TableCell>

            <TableCell className="py-3 align-top">
              <AuditActionBadge action={entry.action} />
            </TableCell>

            <TableCell className="py-3 align-top whitespace-nowrap">
              {entityLabel(entry.entityType)}{' '}
              <span className="font-mono text-muted-foreground">#{entry.entityId}</span>
            </TableCell>

            {/* Never blank: the API guarantees `actor` is present, because the
                actor foreign key is `onDelete: Restrict` (FR-2.6, XBE-5).
                There is no email here — the API sends none (XBE-6). */}
            <TableCell className="py-3 align-top whitespace-nowrap">
              <span className="font-medium">{entry.actor.name}</span>{' '}
              <span className="text-xs text-muted-foreground">{entry.actor.role}</span>
            </TableCell>

            <TableCell className="w-full max-w-0 py-3 align-top">
              <AuditMetadata action={entry.action} metadata={entry.metadata} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
