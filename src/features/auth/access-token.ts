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
 *
 * It deliberately does **not** track the token's expiry. The session is driven
 * entirely by what the server answers: the client discovers an expired access
 * token by being refused, refreshes, and replays. Holding a local clock here
 * would only invite a timer that refreshes on its own — and since every refresh
 * rotates the cookie and slides the 1-day TTL, such a timer would keep an open
 * tab signed in forever.
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
