"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { useEffect, useRef, useState } from "react";

import {
  plannerThreadStorageKey,
  resolvePlannerThreadId,
  type PlannerThreadRow,
} from "@/mastra/thread-types";

import styles from "../app/page.module.css";

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
  const [resourceId, setResourceId] = useState<string | null>(null);
  const pickedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
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
        onThreadId(next);
        if (scopedResourceId.length > 0) {
          window.localStorage.setItem(
            plannerThreadStorageKey(scopedResourceId),
            next,
          );
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "threads failed");
        setThreads([]);
        if (pickedRef.current) return;
        pickedRef.current = true;
        onThreadId(crypto.randomUUID());
      }
    })();
    return () => {
      controller.abort();
    };
  }, [onThreadId, messageCount]);

  function activate(id: string) {
    if (resourceId) {
      window.localStorage.setItem(plannerThreadStorageKey(resourceId), id);
    }
    onThreadId(id);
  }

  return (
    <aside className={styles.threadsDrawer} aria-label="Conversation threads">
      <div className={styles.threadsDrawerHeader}>
        <strong>Threads</strong>
        <button type="button" onClick={() => activate(crypto.randomUUID())}>
          New
        </button>
      </div>
      <p role="alert" aria-live="assertive" aria-atomic="true">
        {error ?? ""}
      </p>
      {threads === null ? (
        <p>Loading threads…</p>
      ) : error ? null : threads.length === 0 ? (
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
                onClick={() => activate(row.id)}
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
