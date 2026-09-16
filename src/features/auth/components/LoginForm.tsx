'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { errorBodyOf, fieldMessage } from '@/lib/error-details';
import { loginSchema, type LoginValues } from '@/lib/schemas/auth';
import { useAuth } from '../hooks/useAuth';
import { resolveRedirect } from '../redirect';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * The only form in this client.
 *
 * Client validation here is UX: it mirrors the backend's rules so the form can
 * respond without a round trip, and is never treated as a substitute for them.
 * Failures branch on the error `code`, never on message copy.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const next = searchParams.get('next');

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    // Validate on submit, then re-validate as the user corrects — not on every
    // keystroke from the start.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    setFocus('email');
  }, [setFocus]);

  // Focus moves to the password field only once submission has settled: both
  // inputs are disabled while a submit is in flight (AC-F03), and focusing a
  // disabled element does nothing. Driven off the rejection itself rather than
  // called inside the submit handler, where `isSubmitting` is still true.
  useEffect(() => {
    if (formError === INVALID_CREDENTIALS_MESSAGE && !isSubmitting) {
      setFocus('password');
    }
  }, [formError, isSubmitting, setFocus]);

  // There is deliberately no "already signed in" check here. `<RequireAnonymous>`
  // in the (auth) layout owns that, and owns it *before* this form renders —
  // redirecting from inside the form meant painting it first and taking it away
  // a round trip later. The `?next=` handling below is this form's own: it is
  // where a user who just authenticated is sent.

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);

    try {
      const user = await login(values);
      router.replace(resolveRedirect(next, user.role));
      return;
    } catch (error) {
      const body = errorBodyOf(error);

      if (body?.code === 'VALIDATION_ERROR' && body.details) {
        // `details` is keyed by request-body field name, so it maps straight
        // onto the inputs — a rule the client missed still lands on the right
        // field rather than in a generic banner. Each value is an **array**, so
        // it is read through `fieldMessage` rather than passed to `setError` as
        // it arrives.
        for (const field of Object.keys(body.details)) {
          if (field === 'email' || field === 'password') {
            setError(field, { type: 'server', message: fieldMessage(body.details, field) });
          }
        }
        return;
      }

      if (body?.code === 'INVALID_CREDENTIALS') {
        setFormError(INVALID_CREDENTIALS_MESSAGE);
        resetField('password');
        // Clearing the field but leaving it revealed would expose whatever is
        // typed next on a shared screen. Re-mask with the reset.
        setShowPassword(false);
        return;
      }

      // 500s and a `fetch` that rejected outright (backend unreachable) are the
      // same story to the user: try again. Never a raw error string.
      setFormError(GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email" className="font-semibold">
            Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="username"
            disabled={isSubmitting}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          <FieldError
            id="email-error"
            className="text-xs"
            errors={errors.email ? [errors.email] : undefined}
          />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password" className="font-semibold">
            Password
          </FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className="pr-9"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              disabled={isSubmitting}
              // The input is already labelled; the toggle needs its own name, and
              // `aria-pressed` is what tells a screen reader which state it is in.
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              aria-controls="password"
              className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOffIcon className="size-4" aria-hidden="true" />
              ) : (
                <EyeIcon className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <FieldError
            id="password-error"
            className="text-xs"
            errors={errors.password ? [errors.password] : undefined}
          />
        </Field>

        {formError && (
          <div role="alert" className="text-center text-sm font-normal text-destructive">
            {formError}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full font-medium">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </FieldGroup>
    </form>
  );
}
