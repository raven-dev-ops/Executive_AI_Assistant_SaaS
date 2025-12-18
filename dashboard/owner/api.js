// Minimal API helpers for the static owner dashboard (no build tooling required).

/**
 * @typedef {Object} AuthorizedFetchDeps
 * @property {string} backendBase
 * @property {() => Record<string, string>} authHeaders
 * @property {() => (string|null|undefined)} getRefreshToken
 * @property {() => Promise<boolean>} refreshAccessToken
 */

/**
 * Creates a fetch wrapper that automatically applies auth headers and retries once after refresh.
 * @param {AuthorizedFetchDeps} deps
 */
export function createAuthorizedFetch({ backendBase, authHeaders, getRefreshToken, refreshAccessToken }) {
  return async function authorizedFetch(path, init = {}) {
    const baseInit = {
      ...init,
      headers: { ...(init.headers || {}), ...authHeaders() },
    };

    let res = await fetch(backendBase + path, baseInit);

    if (res.status === 401 && getRefreshToken()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryInit = {
          ...init,
          headers: { ...(init.headers || {}), ...authHeaders() },
        };
        res = await fetch(backendBase + path, retryInit);
      }
    }

    return res;
  };
}

/**
 * Creates a JSON helper that toggles connection state based on success/failure.
 * @param {{authorizedFetch: (path: string, init?: RequestInit) => Promise<Response>, updateConnectionStatus: (state: string) => void}} deps
 */
export function createFetchJson({ authorizedFetch, updateConnectionStatus }) {
  return async function fetchJson(path, init = {}) {
    try {
      const res = await authorizedFetch(path, init);
      if (!res.ok) {
        updateConnectionStatus("error");
        throw new Error("Request failed: " + res.status);
      }
      updateConnectionStatus("ok");
      return res.json();
    } catch (err) {
      updateConnectionStatus("error");
      throw err;
    }
  };
}

