import { InterviewerInterviewDetail } from '@/features/interviews/components/InterviewerInterviewDetail';

/**
 * `/my-interviews/:interviewId` — one of the interviewer's own rounds, where
 * they read the brief and submit their feedback.
 *
 * **It lives under `/my-interviews` rather than `/interviews`** so that the
 * route an interviewer uses sits under the list they came from, and so that the
 * recruiter's tree can nest a round under the application it belongs to — a
 * path this role could not build, because their payload deliberately carries no
 * application id.
 *
 * Gated to interviewers by the layout, and served the interviewer projection of
 * `GET /api/interviews/:id` regardless: a round outside their own assignments
 * answers 404 from a query that never loaded the row, which is the control.
 */
export default async function MyInterviewPage(props: PageProps<'/my-interviews/[interviewId]'>) {
  const { interviewId } = await props.params;

  return <InterviewerInterviewDetail interviewId={interviewId} />;
}
