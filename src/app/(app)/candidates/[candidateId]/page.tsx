import { CandidateDetailView } from '@/features/candidates/components/CandidateDetailView';

/** Candidate detail page route component. */
export default async function CandidatePage(props: PageProps<'/candidates/[candidateId]'>) {
  const { candidateId } = await props.params;

  return <CandidateDetailView candidateId={candidateId} />;
}
