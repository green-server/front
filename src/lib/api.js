import axios from "axios";
import { useCallback, useEffect, useState } from "react";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export const WS_URL = `${API_URL.replace(/^http/, "ws")}/ws/web`;

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Every status comes back as a response so the checks below decide, as they did with fetch; a body
// that is not JSON (or is empty) reads as null.
const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  validateStatus: () => true,
  transformResponse: [
    (data) => {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    },
  ],
});

/**
 * One API call. `body` is sent as JSON. Failures throw ApiError; the server's error body is
 * `{ error: { code, message } }` (plan/docs/api.md is the source of truth for every shape).
 */
export async function api(path, init) {
  let res;
  try {
    res = await http.request({ url: path, method: init?.method, data: init?.body });
  } catch {
    throw new ApiError("Green Server에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.", 0, "network");
  }

  // A failed login is also a 401, and that one belongs to the form.
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.assign(`/login?next=${next}`);
    return new Promise(() => {}); // Stay in the loading state until the page unloads.
  }
  if (res.status === 204) return undefined;

  const body = res.data;
  if (res.status < 200 || res.status > 299) {
    const error = body?.error;
    throw new ApiError(error?.message ?? `요청을 처리하지 못했습니다. (${res.status})`, res.status, error?.code ?? "unknown");
  }
  return body;
}

// Last answer per path, so returning to a page shows it at once while it refreshes.
const cache = new Map();

/** Must run when the signed-in user changes: the cache holds that user's data. */
export const clearApiCache = () => cache.clear();

export function useApi(path) {
  const [state, setState] = useState({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    api(path).then(
      (data) => {
        cache.set(path, data);
        if (!stale) setState({ path, data });
      },
      // Keep data only if it belongs to this path: a failed switch must not relabel the old range.
      (error) =>
        !stale &&
        setState((prev) => (prev.path === path ? { ...prev, error } : { path, data: cache.get(path), error })),
    );
    return () => {
      stale = true;
    };
  }, [path, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const mutate = useCallback(
    (update) =>
      setState((prev) => {
        // Right after navigating, state still holds the previous path's data.
        if (prev.path !== path || prev.data === undefined) return prev;
        const data = update(prev.data);
        cache.set(path, data);
        return { ...prev, data };
      }),
    [path],
  );

  // Data from the previous path must never render under the new one.
  const current = state.path === path ? state : { data: cache.get(path), error: undefined };
  return {
    data: current.data,
    error: current.data === undefined ? current.error : undefined,
    reload,
    mutate,
  };
}

/** Busy and error state for a form or button that calls the API. */
export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async (task) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, run };
}
