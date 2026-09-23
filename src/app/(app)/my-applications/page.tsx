import { ApplicationsListView } from '@/features/applications/components/ApplicationsListView';

/**
 * `/my-applications` — everything the signed-in candidate has applied to.
 *
 * No Suspense boundary and no dispatch: this branch reads no search params, and
 * the role it renders for is the layout's guard rather than a runtime check.
 * The server scopes the list to the caller's own rows inside the query, so the
 * page sends no candidate id.
 */
export default function MyApplicationsPage() {
  return <ApplicationsListView />;
}
