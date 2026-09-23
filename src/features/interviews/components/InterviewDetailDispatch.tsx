'use client';

import { NotFoundView } from '@/components/NotFoundView';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { InterviewerInterviewDetail } from './InterviewerInterviewDetail';
import { RecruiterInterviewDetail } from './RecruiterInterviewDetail';

interface InterviewDetailDispatchProps {
  interviewId: string;
}

/**
 * Chooses which detail view runs, on the signed-in role.
 *
 * **The two components do not share a props type**, so this switch is the only
 * place the choice is made and getting it wrong is a compile error rather than
 * a recruiter's payload arriving at a component written for an interviewer.
 * That is why there is no single `<InterviewDetail>` with a role prop.
 *
 * The dispatch is **not** what protects anything. Each branch calls the same
 * endpoint; the API picks the projection from the verified token, so an
 * interviewer could not obtain the recruiter's shape by reaching the other
 * branch. What the branch decides is which shape this client is prepared to
 * render.
 *
 * A candidate never arrives — the route layout turns them away first — but the
 * exhaustive switch renders the app's 404 rather than nothing if the guard ever
 * changes.
 */
export const InterviewDetailDispatch: React.FC<InterviewDetailDispatchProps> = ({
  interviewId,
}) => {
  const { user } = useAuth();

  // `RequireAuth` in the app layout renders its own loading and anonymous
  // states, so a user is present by the time this runs.
  if (!user) {
    return null;
  }

  if (user.role === 'RECRUITER') {
    return <RecruiterInterviewDetail interviewId={interviewId} />;
  }

  if (user.role === 'INTERVIEWER') {
    return <InterviewerInterviewDetail interviewId={interviewId} />;
  }

  return <NotFoundView />;
};
