import { RecruiterApplicationDetail } from '@/features/applications/components/RecruiterApplicationDetail';

/**
 * `/interviews/:applicationId` — **one candidate's whole interview process**:
 * the stage timeline and every round, with each round opening its own page
 * below this one.
 *
 * The middle of the three levels this feature is arranged in:
 *
 * ```
 * /interviews                              who is in a process
 * /interviews/:applicationId               one person's rounds   ← here
 * /interviews/:applicationId/:interviewId  one round
 * ```
 *
 * The component is `features/applications`', because the payload is an
 * application's: one request to `GET /api/applications/:id` carries the
 * candidate, the role, the timeline and the rounds. The route is under
 * `/interviews` because that is the question it answers — the application it
 * renders is one already in process, and the inbox at `/applications` is the
 * list of those that are not.
 *
 * `params` is a promise in Next 16, so this stays a server component that
 * awaits it and hands the raw segment down. The segment is validated
 * client-side by `parseApplicationId`, which renders the not-found view without
 * a request for anything that is not a positive integer.
 *
 * Recruiter-only by the layout's `<RequireRole>`. That guard is an affordance;
 * the API refusing everyone else is the control.
 */
export default async function InterviewProcessPage(
  props: PageProps<'/interviews/[applicationId]'>,
) {
  const { applicationId } = await props.params;

  return <RecruiterApplicationDetail applicationId={applicationId} />;
}
