import { DashboardView } from '@/features/pipeline/components/DashboardView';

/**
 * The recruiter's landing page (FR-1.1, D-1).
 *
 * No `<Suspense>` here, unlike `/pipeline`: `DashboardView` reads no search
 * parameters — it always shows the unfiltered totals — so there is nothing for
 * a boundary to catch and `next build` has no complaint.
 */
export default function DashboardPage() {
  return <DashboardView />;
}
