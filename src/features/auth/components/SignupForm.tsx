'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { errorBodyOf, fieldMessage } from '@/lib/error-details';
import { signupSchema, type SignupValues } from '@/lib/schemas/auth';
import { signup } from '../api/auth.api';

const EMAIL_TAKEN_MESSAGE = 'An account with this email already exists.';
const GENERIC_ERROR_MESSAGE = 'Could not create your account. Try again.';
const SUCCESS_MESSAGE = 'Account created. Sign in to continue.';

/** The fields this form owns. Anything else in `details` is ignored, not guessed at. */
const FIELDS = ['name', 'email', 'password'] as const;

type FieldName = (typeof FIELDS)[number];

const isFieldName = (value: string): value is FieldName => {
  return (FIELDS as ReadonlyArray<string>).includes(value);
};

/**
 * The app's only account-creation surface, and it creates **candidates only**.
 *
 * There is no role selector here and there must never be one: the backend
 * removed `role` from the signup contract and hard-codes `CANDIDATE`, so an
 * input for it would offer a choice the server does not honour.
 *
 * On success this does **not** log the user in. The backend deliberately issues
 * no token and no cookie on signup, so the honest thing is to send them to
 * `/login` with a toast — an auto-login would paper over that guarantee with a
 * second request the user never asked for.
 */
export const SignupForm: React.FC = () => {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    setFocus('name');
  }, [setFocus]);

  // No "already signed in" check here either — `<RequireAnonymous>` in the (auth)
  // layout gates both forms, so neither renders for a session that has one.

  const onSubmit = async (values: SignupValues) => {
    setFormError(null);

    try {
      await signup(values);
      toast.success(SUCCESS_MESSAGE);
      router.replace('/login');
      return;
    } catch (error) {
      const body = errorBodyOf(error);

      if (body?.code === 'VALIDATION_ERROR' && body.details) {
        // `details` is keyed by request-body field name, so a rule this client
        // missed still lands on the right input. Each value is an array, hence
        // `fieldMessage` rather than passing it to `setError` as it arrives.
        let firstFailing: FieldName | null = null;

        for (const field of Object.keys(body.details)) {
          if (isFieldName(field)) {
            setError(field, { type: 'server', message: fieldMessage(body.details, field) });
            // FIELDS order, not response order, so focus lands on the topmost
            // failing input rather than whichever the server listed first.
            if (firstFailing === null || FIELDS.indexOf(field) < FIELDS.indexOf(firstFailing)) {
              firstFailing = field;
            }
          }
        }

        if (firstFailing) {
          setFocus(firstFailing);
        }
        return;
      }

      if (body?.code === 'EMAIL_TAKEN') {
        // On the field, not in a banner — it is that input that needs changing,
        // and the message carries its own way out via the link below.
        setError('email', { type: 'server', message: EMAIL_TAKEN_MESSAGE });
        setFocus('email');
        return;
      }

      // A 500 and a `fetch` that rejected outright are the same story to the
      // user. Never a raw error string, and the fields keep their values.
      setFormError(GENERIC_ERROR_MESSAGE);
    }
  };

  const emailTaken = errors.email?.message === EMAIL_TAKEN_MESSAGE;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name" className="font-semibold">
            Name
          </FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            disabled={isSubmitting}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          <FieldError
            id="name-error"
            className="text-xs"
            errors={errors.name ? [errors.name] : undefined}
          />
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email" className="font-semibold">
            Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
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
          {emailTaken && (
            <p className="text-xs text-muted-foreground">
              <Link href="/login" className="font-medium underline underline-offset-4">
                Sign in instead
              </Link>
            </p>
          )}
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password" className="font-semibold">
            Password
          </FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              autoComplete="new-password"
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
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              aria-controls="password"
              className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </FieldGroup>
    </form>
  );
};
