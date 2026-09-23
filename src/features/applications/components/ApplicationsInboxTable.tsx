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

/**
 * **Candidate · Role · Applied · action** — the whole of `/applications`
 * (applications FR-1.3).
 *
 * This is the recruiter's inbox, and an inbox answers one question: who has
 * applied, and do I want to talk to them? So there is no stage, no status and
 * no round count here — those are facts about a process that has started, and
 * a process that has started belongs on `/interviews`.
 *
 * **Nothing in a row navigates except the button.** The row is not clickable
 * and the candidate's name is not a link, deliberately: `/applications` is the
 * head of exactly one path — press the button, the candidate moves to
 * `/interviews` — and a second way out of the row would fork that path before
 * the recruiter has made the only decision this page asks for.
 *
 * There is no email column and no contact detail of any kind: the payload
 * carries none, because the backend's list projection selects none.
 */

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
