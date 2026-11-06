"use client";

import { createContext, useCallback, useContext, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { api, WS_URL } from "./api";
import type { WebEvent } from "./types";

// `reconnected` tells pages to refetch whatever they missed while the socket was down.
export type LiveEvent = WebEvent | { type: "reconnected" };
type Listener = (event: LiveEvent) => void;

const LiveContext = createContext<{ subscribe: (listener: Listener) => () => void; dropped: boolean }>({
  subscribe: () => () => {},
  dropped: false,
});

const MAX_DELAY_MS = 30_000;

export function LiveProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<Listener>());
  const [dropped, setDropped] = useState(false);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => void listeners.current.delete(listener);
  }, []);

  useEffect(() => {
    let socket: WebSocket;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const emit = (event: LiveEvent) => listeners.current.forEach((listener) => listener(event));

    const connect = () => {
      socket = new WebSocket(WS_URL);
      socket.onopen = () => {
        if (failures > 0) emit({ type: "reconnected" });
        failures = 0;
        setDropped(false);
      };
      socket.onmessage = (message) => {
        try {
          emit(JSON.parse(message.data as string) as WebEvent);
        } catch {
          // Ignore a malformed frame rather than dropping the stream.
        }
      };
      socket.onclose = () => {
        setDropped(true);
        // The browser hides the upgrade status, so ask REST whether the session expired.
        api("/api/me").catch(() => {});
        timer = setTimeout(connect, Math.min(1000 * 2 ** failures, MAX_DELAY_MS));
        failures += 1;
      };
    };

    connect();
    return () => {
      clearTimeout(timer);
      socket.onclose = null;
      socket.close();
    };
  }, []);

  return <LiveContext.Provider value={{ subscribe, dropped }}>{children}</LiveContext.Provider>;
}

export const useLiveDropped = () => useContext(LiveContext).dropped;

export function useLive(onEvent: Listener) {
  const { subscribe } = useContext(LiveContext);
  const handler = useEffectEvent(onEvent);
  useEffect(() => subscribe((event) => handler(event)), [subscribe]);
}
