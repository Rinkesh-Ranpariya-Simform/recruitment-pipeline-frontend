import { RecruiterInterviewDetail } from '@/features/interviews/components/RecruiterInterviewDetail';

/**
 * `/interviews/:applicationId/:interviewId` — one round, the leaf: its panel,
 * its feedback and the Select / Reject pair.
 *
 * **Nested under the process rather than flat**, because a round is a step
 * inside one person's process and never a thing to reach on its own. The URL
 * then reads the way the pages do, and the back link up one segment is exactly
 * the page that linked here.
 *
 * There is no role dispatch on this route any more: the layout admits
 * recruiters only, so there is one projection to render and the component takes
 * it directly. An interviewer's round is `/my-interviews/:interviewId`, which
 * renders the other projection of the same endpoint.
 *
 * Both raw segments are passed straight through: the component below decides
 * whether they are valid ids **and whether they agree with each other**, since
 * it is the one holding the payload that can answer the second question.
 */
export default async function InterviewRoundPage(
  props: PageProps<'/interviews/[applicationId]/[interviewId]'>,
) {
  const { applicationId, interviewId } = await props.params;

  return <RecruiterInterviewDetail applicationId={applicationId} interviewId={interviewId} />;
}
