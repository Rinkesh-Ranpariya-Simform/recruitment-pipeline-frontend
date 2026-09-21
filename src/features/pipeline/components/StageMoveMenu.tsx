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
  /**
   * The stage order **as the API gave it** — `role.stages.map(cell => cell.stage)`
   * from the board response (FR-5.2, FE-8).
   *
   * It is passed in rather than imported so that "what comes next" is answered
   * by the server's own densified array. This client owns **no copy of the
   * stage graph**: this is a sequence for reading off the next label, and the
   * question of whether a move is *legal* is only ever answered by the API —
   * either by a `200`, or by a `409` whose `details.allowed` rebuilds this menu.
   */
  stageOrder: ReadonlyArray<PipelineStage>;
}

/**
 * What a recruiter can do to one application (FR-5.1).
 *
 * **Advance · Mark hired · Mark rejected · Override stage…**
 *
 * The three rules worth knowing:
 *
 * - **The menu never asserts the stage graph.** `Advance` offers the next stage
 *   in the API's own array; if the server disagrees, its `409` carries
 *   `details.allowed` and the menu **rebuilds from that** (FR-5.6, XBE-2).
 *   There is no transitions map in this feature to disagree with the server
 *   (FE-8, SEC-6).
 * - **Mark hired is disabled outside Offer, and that is an affordance, not a
 *   control** (FR-5.4, AZ-4). The item is shown rather than hidden so the menu
 *   teaches the rule — "Only from Offer." — instead of leaving a recruiter to
 *   wonder where it went. Fired anyway from the console, the API answers
 *   `409 INVALID_STAGE_TRANSITION`, which is what actually enforces it
 *   (EC-07, AC-M04).
 * - **No optimistic update** (FE-6). While a move is in flight this row's
 *   trigger is disabled and spinning; every other row stays interactive,
 *   because each row owns its own mutation (FR-5.9).
 */
export const StageMoveMenu: React.FC<StageMoveMenuProps> = ({ application, stageOrder }) => {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [outcome, setOutcome] = useState<OutcomeStatus | null>(null);

  /**
   * The stages the **server** last said were reachable, or `null` before it has
   * said anything.
   *
   * Populated only from a `409 INVALID_STAGE_TRANSITION`'s `details.allowed`
   * (FR-5.6, API-5). Until then the menu offers the next stage in the API's
   * array, which is the ordinary case and is right every time the client's view
   * of the row is current.
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
      // (API-5, FE-8). Read from the body, never inferred from the message.
      if (body?.code === 'INVALID_STAGE_TRANSITION') {
        const next = body.details?.allowed;

        if (Array.isArray(next)) {
          setAllowed(next as Array<PipelineStage>);
        }
      }
      // Every failure has already raised its toast from the mutation, and the
      // board and summary have already been invalidated on settle — so a
      // conflict corrects the view without anything further here (FE-5, FR-5.7).
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
            // control (FR-5.4).
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
