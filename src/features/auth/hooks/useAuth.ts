'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LoginValues } from '@/lib/schemas/auth';
import { useAuthContext } from '../AuthProvider';
import { clearAccessToken, setAccessToken } from '../access-token';
import { getMe, login as loginRequest, logout as logoutRequest } from '../api/auth.api';
import type { User, UserRole } from '../types';

/** The one query key this feature introduces. */
export const ME_QUERY_KEY = ['auth', 'me'] as const;

interface UseAuthResult {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (values: LoginValues) => Promise<User>;
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  /**
   * A failure to resolve identity that a refresh could not fix — a 500 or an
   * unreachable backend. A 401 never surfaces here: the interceptor turns that
   * into a redirect to /login.
   */
  identityError: unknown;
  /** Retries `GET /api/auth/me` after `identityError`. */
  retryIdentity: () => void;
}

/**
 * The app's view of the current session.
 *
 * `GET /api/auth/me` is the single source of truth for identity — role is read
 * from it and never from a URL, a form field, browser storage, or a decoded
 * token. The access token is opaque to this client.
 */
export const useAuth = (): UseAuthResult => {
  const { status, setStatus, signOut } = useAuthContext();
  const queryClient = useQueryClient();
  const router = useRouter();

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    // A genuine 401 here is not worth retrying — it only delays the redirect.
    retry: false,
    enabled: status === 'authenticated',
    // Identity is fetched once per page load and reused everywhere, so moving
    // between two authenticated routes costs zero extra calls. Staleness is
    // harmless: no endpoint changes a user's role. Login, logout and a failed
    // refresh all reset the cache, and `retryIdentity` forces a fetch.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginValues): Promise<User> => {
      const result = await loginRequest(values);
      setAccessToken(result.accessToken);

      // The login response carries a user, but /me is the authority — identity
      // is established by asking the server who the token belongs to.
      const user = await queryClient.fetchQuery({
        queryKey: ME_QUERY_KEY,
        queryFn: getMe,
        staleTime: 0,
      });

      setStatus('authenticated');
      return user;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await logoutRequest();
      } catch {
        // A user who clicks log out is logged out locally regardless of the
        // network. The server-side session outlives it only until the cookie
        // expires, which is the accepted trade-off for not stranding them in a
        // session they have asked to leave.
      }

      clearAccessToken();
      signOut();
      queryClient.clear();
      router.replace('/login');
    },
  });

  const { mutateAsync: runLogin } = loginMutation;
  const { mutateAsync: runLogout } = logoutMutation;
  const { refetch: refetchMe } = meQuery;

  const login = useCallback((values: LoginValues) => runLogin(values), [runLogin]);
  const logout = useCallback(() => runLogout(), [runLogout]);
  const retryIdentity = useCallback(() => void refetchMe(), [refetchMe]);

  const user = meQuery.data ?? null;

  return {
    user,
    role: user?.role ?? null,
    isLoading: status === 'bootstrapping' || (status === 'authenticated' && meQuery.isPending),
    isAuthenticated: status === 'authenticated' && user !== null,
    login,
    logout,
    isLoggingOut: logoutMutation.isPending,
    identityError: status === 'authenticated' ? meQuery.error : null,
    retryIdentity,
  };
};
