"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../components/providers";
import type { RequestOptions } from "./api";

export function useResource<T>(
  path: string | null,
  poll = 0,
  envelope: RequestOptions["envelope"] = "data",
) {
  const { api, session } = useAuth();
  const identity = `${session?.user.id ?? ""}:${path}:${envelope}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    identity: string;
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ identity, data: null, error: null, loading: true });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!path || !session?.user.id) return;
    let alive = true;
    let inFlight = false;
    const controller = new AbortController();
    const load = async () => {
      if (document.visibilityState === "hidden" || inFlight) return;
      inFlight = true;
      setState((old) => ({
        identity,
        data: old.identity === identity ? old.data : null,
        error: null,
        loading: true,
      }));
      try {
        const data = await api<T>(path, {
          signal: controller.signal,
          envelope,
        });
        if (alive) setState({ identity, data, error: null, loading: false });
      } catch (error) {
        if (alive)
          setState({
            identity,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Could not load this page.",
            loading: false,
          });
      } finally {
        inFlight = false;
      }
    };
    void load();
    const interval = poll ? setInterval(() => void load(), poll) : null;
    const focus = () => void load();
    window.addEventListener("focus", focus);
    window.addEventListener("online", focus);
    document.addEventListener("visibilitychange", focus);
    const taskStateChanged = () => {
      if (/^\/api\/(tasks|today|study-sessions|experience\/(activities|courses))/.test(path)) void load();
    };
    window.addEventListener("sf:task-state-changed", taskStateChanged);
    return () => {
      alive = false;
      controller.abort();
      if (interval) clearInterval(interval);
      window.removeEventListener("focus", focus);
      window.removeEventListener("online", focus);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("sf:task-state-changed", taskStateChanged);
    };
  }, [api, session?.user.id, path, poll, envelope, revision, identity]);
  return {
    ...(state.identity === identity
      ? state
      : { data: null, error: null, loading: true }),
    refresh,
  };
}
export function useAction() {
  const locked = useRef(false),
    mounted = useRef(true);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await action();
      window.dispatchEvent(new Event("sf:task-state-changed"));
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "This action could not be completed.",
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return { busy, message, setMessage, run };
}
