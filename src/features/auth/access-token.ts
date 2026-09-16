/**
 * The in-memory access-token store.
 *
 * The token lives in a module-scoped variable and **nowhere else** — never in
 * localStorage, sessionStorage, IndexedDB, or a cookie. Injected script
 * therefore has no persistent artefact to steal, and a page reload starts with
 * no token at all (the refresh cookie is what recovers one, via bootstrap).
 *
 * This is deliberately not React state: `apiFetch` has to read it synchronously
 * from outside the React tree.
 */

let accessToken: string | null = null;

export const getAccessToken = (): string | null => {
  return accessToken;
};

export const setAccessToken = (token: string): void => {
  accessToken = token;
};

export const clearAccessToken = (): void => {
  accessToken = null;
};
