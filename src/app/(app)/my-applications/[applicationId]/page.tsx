import { CandidateApplicationDetail } from '@/features/applications/components/CandidateApplicationDetail';

/**
 * `/my-applications/:applicationId` — one of the candidate's own applications.
 *
 * `params` is a promise in Next 16, so this stays a server component that
 * awaits it and hands the raw segment down. The segment is validated
 * client-side by `parseApplicationId`, which renders the not-found view without
 * a request for anything that is not a positive integer.
 *
 * Candidate-only by the layout's `<RequireRole>`. That guard is an affordance;
 * the API answering 404 for someone else's id is the control.
 */
export default async function MyApplicationDetailPage(
  props: PageProps<'/my-applications/[applicationId]'>,
) {
  const { applicationId } = await props.params;

  return <CandidateApplicationDetail applicationId={applicationId} />;
}
