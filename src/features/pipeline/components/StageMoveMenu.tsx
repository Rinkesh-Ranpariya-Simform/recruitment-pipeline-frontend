'use client';

import { useState } from 'react';
import { ChevronRightIcon, Loader2Icon, MoreHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { errorBodyOf } from '@/lib/error-details';
import { useMoveStage } from '../hooks/usePipelineMutations';
import { pipelineStageLabel } from '../labels';
import type { OutcomeStatus, PipelineApplication, PipelineStage } from '../types';
import { OutcomeDialog } from './OutcomeDialog';
import { StageOverrideDialog } from './StageOverrideDialog';

interface StageMoveMenuProps {
  application: PipelineApplication;
  /** The ordered list of pipeline stages from the server. */
  stageOrder: ReadonlyArray<PipelineStage>;
}

/**
 * Context menu for pipeline actions on an application: Advance, Mark Hired, Mark Rejected, and Override Stage.
 */
export const StageMoveMenu: React.FC<StageMoveMenuProps> = ({ application, stageOrder }) => {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [outcome, setOutcome] = useState<OutcomeStatus | null>(null);

  /**
   * Permitted transition stages returned by the server on a 409 conflict, or null before any conflict.
   */
  const [allowed, setAllowed] = useState<Array<PipelineStage> | null>(null);

  const moveMutation = useMoveStage();
  const isMoving = moveMutation.isPending;

  const currentIndex = stageOrder.indexOf(application.currentStage);
  const nextStage =
    currentIndex >= 0 && currentIndex < stageOrder.length - 1
      ? stageOrder[currentIndex + 1]
      : undefined;

  // After a refusal, the server's list wins. Before one, the next stage in the
  // board's order — one item, which is the shape of a one-step-forward process.
  const advanceTargets = allowed ?? (nextStage === undefined ? [] : [nextStage]);

  const advance = async (toStage: PipelineStage) => {
    try {
      await moveMutation.mutateAsync({ applicationId: application.id, toStage });
      // The move landed, so whatever the server previously refused no longer
      // describes this row. Dropping it puts the menu back on the board's order.
      setAllowed(null);
    } catch (error) {
      const body = errorBodyOf(error);

      // `details.allowed` is the ONLY source of stage legality in this client
      // Read allowed transition stages directly from server error body.
      if (body?.code === 'INVALID_STAGE_TRANSITION') {
        const next = body.details?.allowed;

        if (Array.isArray(next)) {
          setAllowed(next as Array<PipelineStage>);
        }
      }
      // Every failure has already raised its toast from the mutation, and the
      // board and summary have already been invalidated on settle — so a
      // 409 conflict refetches data to sync with server state.
    }
  };

  const canHire = application.currentStage === 'OFFER';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" disabled={isMoving} />}
          aria-label={`Move this candidate, currently at ${pipelineStageLabel(application.currentStage)}`}
        >
          {isMoving ? (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          ) : (
            <MoreHorizontalIcon aria-hidden="true" />
          )}
          Move
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {advanceTargets.map((stage) => (
            <DropdownMenuItem key={stage} onClick={() => void advance(stage)}>
              <ChevronRightIcon aria-hidden="true" />
              Advance to {pipelineStageLabel(stage)}
            </DropdownMenuItem>
          ))}

          <DropdownMenuItem
            disabled={!canHire}
            onClick={() => setOutcome('HIRED')}
            // The hint is on the item itself rather than a tooltip: a disabled
            // control a recruiter cannot hover to understand is just a dead
            // Hired action is only accessible from the Offer stage.
            title={canHire ? undefined : 'Only from Offer.'}
          >
            <span className="flex w-full items-center justify-between gap-2">
              Mark hired
              {!canHire && <span className="text-xs text-muted-foreground">Only from Offer.</span>}
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setOutcome('REJECTED')}>Mark rejected</DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setOverrideOpen(true)}>Override stage…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StageOverrideDialog
        applicationId={application.id}
        currentStage={application.currentStage}
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
      />

      {outcome !== null && (
        <OutcomeDialog
          applicationId={application.id}
          status={outcome}
          open
          onOpenChange={(open) => {
            if (!open) {
              setOutcome(null);
            }
          }}
        />
      )}
    </>
  );
};
