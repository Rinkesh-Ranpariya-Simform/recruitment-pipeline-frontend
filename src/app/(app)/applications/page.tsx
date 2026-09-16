import { ApplicationsListView } from '@/features/applications/components/ApplicationsListView';

/** Reads no search params, so it needs no Suspense boundary. */
export default function ApplicationsPage() {
  return <ApplicationsListView />;
}
