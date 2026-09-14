import { ApiStatusCard } from '@/components/api-status-card';
import { QuickNoteForm } from '@/components/quick-note-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Recruitment Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Frontend scaffold — Next.js, Tailwind, shadcn/ui, TanStack Query, React Hook Form, Zod.
        </p>
      </div>

      <ApiStatusCard />

      <Card>
        <CardHeader>
          <CardTitle>Form wiring check</CardTitle>
          <CardDescription>react-hook-form + zod validation, no backend route yet</CardDescription>
        </CardHeader>
        <CardContent>
          <QuickNoteForm />
        </CardContent>
      </Card>
    </main>
  );
}
