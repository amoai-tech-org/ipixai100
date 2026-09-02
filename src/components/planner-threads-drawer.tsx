"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { useEffect, useRef, useState } from "react";

import { ErrorState } from "@/components/ui/error-state";
import {
  plannerThreadStorageKey,
  resolvePlannerThreadId,
  type PlannerThreadRow,
} from "@/mastra/thread-types";

import styles from "../app/page.module.css";

export type PlannerThreadSelection = {
  threadId: string;
  replay: boolean;
};

type PlannerThreadsDrawerProps = {
  threadId: string | null;
  onThreadId: (threadId: string, selection: PlannerThreadSelection) => void;
};

export function PlannerThreadsDrawer({
  threadId,
  onThreadId,
}: PlannerThreadsDrawerProps) {
  const { agent } = useAgent({ agentId: "default" });
  const messageCount = agent.messages?.length ?? 0;
  const [threads, setThreads] = useState<PlannerThreadRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const pickedRef = useRef(false);
  const threadsRef = useRef(threads);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    const controller = new AbortController();
    const hadList = threadsRef.current !== null;
    setError(null);
    if (!hadList) {
      setThreads(null);
    }
    void (async () => {
      try {
        const response = await fetch("/api/planner/threads", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`threads ${response.status}`);
        }
        const body = (await response.json()) as {
          resourceId?: string;
          threads?: PlannerThreadRow[];
        };
        if (controller.signal.aborted) return;
        const rows = body.threads ?? [];
        const scopedResourceId =
          typeof body.resourceId === "string" ? body.resourceId : "";
        setResourceId(scopedResourceId || null);
        setThreads(rows);
        setError(null);
        if (pickedRef.current) return;
        pickedRef.current = true;
        const stored =
          scopedResourceId.length > 0
            ? window.localStorage.getItem(
                plannerThreadStorageKey(scopedResourceId),
              )
            : null;
        const next = resolvePlannerThreadId(rows, stored);
        const replay = rows.some((row) => row.id === next);
        onThreadId(next, { threadId: next, replay });
        if (scopedResourceId.length > 0) {
          window.localStorage.setItem(
            plannerThreadStorageKey(scopedResourceId),
            next,
          );
        }
      } catch {
        if (controller.signal.aborted) return;
        setError("Could not load saved conversations. Try again.");
        if (threadsRef.current === null) {
          setThreads([]);
        }
      }
    })();
    return () => {
      controller.abort();
    };
  }, [onThreadId, messageCount, retryKey]);

  function activate(id: string, replay: boolean) {
    pickedRef.current = true;
    if (resourceId) {
      window.localStorage.setItem(plannerThreadStorageKey(resourceId), id);
    }
    onThreadId(id, { threadId: id, replay });
  }

  return (
    <aside className={styles.threadsDrawer} aria-label="Conversation threads">
      <div className={styles.threadsDrawerHeader}>
        <strong>Threads</strong>
        <button type="button" onClick={() => activate(crypto.randomUUID(), false)}>
          New
        </button>
      </div>
      {error ? (
        <ErrorState
          title="Could not load threads"
          message={error}
          onRetry={() => setRetryKey((n) => n + 1)}
        />
      ) : threads === null ? (
        <p>Loading threads…</p>
      ) : threads.length === 0 ? (
        <p>No saved threads yet.</p>
      ) : (
        <ul className={styles.threadsList}>
          {threads.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                aria-current={row.id === threadId ? "true" : undefined}
                className={
                  row.id === threadId ? styles.threadActive : styles.threadButton
                }
                onClick={() => activate(row.id, true)}
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
