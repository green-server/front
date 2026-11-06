"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiErrorBody } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const WS_URL = `${API_URL.replace(/^http/, "ws")}/ws/web`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: init?.method,
      credentials: "include",
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError("Green Server에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.", 0, "network");
  }

  // A failed login is also a 401, and that one belongs to the form.
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const next = encodeURIComponent(location.pathname + location.search);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- runs outside React, so no router here.
    location.assign(`/login?next=${next}`);
    return new Promise<T>(() => {}); // Stay in the loading state until the page unloads.
  }
  if (res.status === 204) return undefined as T;

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiError(error?.message ?? `요청을 처리하지 못했습니다. (${res.status})`, res.status, error?.code ?? "unknown");
  }
  return body as T;
}

export function useApi<T>(path: string) {
  const [state, setState] = useState<{ path?: string; data?: T; error?: Error }>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    api<T>(path).then(
      (data) => !stale && setState({ path, data }),
      (error: Error) => !stale && setState((prev) => ({ ...prev, path, error })),
    );
    return () => {
      stale = true;
    };
  }, [path, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const mutate = useCallback(
    (update: (data: T) => T) =>
      setState((prev) => (prev.data === undefined ? prev : { ...prev, data: update(prev.data) })),
    [],
  );

  // Data from the previous path must never render under the new one.
  const current = state.path === path ? state : {};
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
  const [error, setError] = useState<string | null>(null);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, run };
}
