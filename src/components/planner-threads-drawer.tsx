"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { useEffect, useRef, useState } from "react";

import type { PlannerThreadRow } from "@/mastra/thread-types";

import styles from "../app/page.module.css";

const LAST_THREAD_KEY = "ipix.planner.threadId";

type PlannerThreadsDrawerProps = {
  threadId: string | null;
  onThreadId: (threadId: string) => void;
};

export function PlannerThreadsDrawer({
  threadId,
  onThreadId,
}: PlannerThreadsDrawerProps) {
  const { agent } = useAgent({ agentId: "default" });
  const messageCount = agent.messages?.length ?? 0;
  const [threads, setThreads] = useState<PlannerThreadRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pickedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/planner/threads", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`threads ${response.status}`);
        }
        const body = (await response.json()) as { threads?: PlannerThreadRow[] };
        if (cancelled) return;
        const rows = body.threads ?? [];
        setThreads(rows);
        setError(null);
        if (pickedRef.current) return;
        pickedRef.current = true;
        const stored = window.localStorage.getItem(LAST_THREAD_KEY);
        const next =
          rows.find((row) => row.id === stored)?.id ??
          rows[0]?.id ??
          stored ??
          crypto.randomUUID();
        onThreadId(next);
        window.localStorage.setItem(LAST_THREAD_KEY, next);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "threads failed");
        setThreads([]);
        if (pickedRef.current) return;
        pickedRef.current = true;
        const fallback =
          window.localStorage.getItem(LAST_THREAD_KEY) ?? crypto.randomUUID();
        onThreadId(fallback);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onThreadId, messageCount]);

  function select(id: string) {
    window.localStorage.setItem(LAST_THREAD_KEY, id);
    onThreadId(id);
  }

  function startNew() {
    const id = crypto.randomUUID();
    window.localStorage.setItem(LAST_THREAD_KEY, id);
    onThreadId(id);
  }

  return (
    <aside className={styles.threadsDrawer} aria-label="Conversation threads">
      <div className={styles.threadsDrawerHeader}>
        <strong>Threads</strong>
        <button type="button" onClick={startNew}>
          New
        </button>
      </div>
      {threads === null ? (
        <p>Loading threads…</p>
      ) : error ? (
        <p>{error}</p>
      ) : threads.length === 0 ? (
        <p>No saved threads yet.</p>
      ) : (
        <ul className={styles.threadsList}>
          {threads.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={
                  row.id === threadId ? styles.threadActive : styles.threadButton
                }
                onClick={() => select(row.id)}
              >
                {row.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
