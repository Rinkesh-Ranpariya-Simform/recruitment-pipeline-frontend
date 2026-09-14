'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { quickNoteSchema, type QuickNoteValues } from '@/lib/schemas/quick-note';

/**
 * Wiring smoke test for react-hook-form + zod + shadcn's Field primitive.
 * Validates client-side only — nothing is sent to the backend yet.
 */
export function QuickNoteForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickNoteValues>({
    resolver: zodResolver(quickNoteSchema),
    defaultValues: { title: '', note: '' },
  });

  const onSubmit = async (values: QuickNoteValues) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    toast.success(`Saved "${values.title}"`);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input id="title" placeholder="e.g. Panel debrief" {...register('title')} />
          <FieldError errors={errors.title ? [errors.title] : undefined} />
        </Field>

        <Field data-invalid={!!errors.note}>
          <FieldLabel htmlFor="note">Note</FieldLabel>
          <Textarea id="note" placeholder="What happened?" {...register('note')} />
          <FieldError errors={errors.note ? [errors.note] : undefined} />
        </Field>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save note'}
        </Button>
      </FieldGroup>
    </form>
  );
}
