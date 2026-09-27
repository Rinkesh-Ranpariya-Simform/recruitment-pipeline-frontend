'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import type { RecruiterApplication } from '../types';
import { StartPhoneScreenButton } from './StartPhoneScreenButton';

/** Table component displaying newly applied candidates in the recruiter inbox. */

interface ApplicationsInboxTableProps {
  applications: Array<RecruiterApplication>;
}

export const ApplicationsInboxTable: React.FC<ApplicationsInboxTableProps> = ({ applications }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-full">Candidate</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((application) => (
          <TableRow key={application.id} className="hover:bg-transparent">
            {/* `max-w-0` with `w-full` lets this cell take the leftover width
                and truncate inside it, so a long name cannot scroll the table
                sideways. */}
            <TableCell className="w-full max-w-0 py-3">
              <span className="block truncate font-medium" title={application.candidate.name}>
                {application.candidate.name}
              </span>
            </TableCell>
            <TableCell className="py-3 text-muted-foreground">
              <span className="block max-w-48 truncate" title={application.role.title}>
                {application.role.title}
              </span>
            </TableCell>
            <TableCell className="py-3 text-muted-foreground">
              <div className="flex flex-col">
                <span className="whitespace-nowrap">{formatAbsolute(application.createdAt)}</span>
                <span className="text-xs whitespace-nowrap">
                  {formatRelative(application.createdAt)}
                </span>
              </div>
            </TableCell>
            <TableCell className="py-3 text-right">
              <StartPhoneScreenButton application={application} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
