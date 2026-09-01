"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { useEffect, useRef, useState } from "react";

import { ErrorState } from "@/components/ui/error-state";
import type { PlannerChatMessage } from "@/mastra/thread-types";

function replayErrorMessage(status: number) {
  if (status === 403) {
    return "This conversation is not available for your organization.";
  }
  if (status === 401) {
    return "Sign in required to load this conversation.";
  }
  return "Could not load this conversation. Try again.";
}

export function RestoreMastraHistory({
  threadId,
  replay = true,
}: {
  threadId: string;
  replay?: boolean;
}) {
  const { agent } = useAgent({ agentId: "default" });
  const agentRef = useRef(agent);
  const baselineRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [restored, setRestored] = useState<PlannerChatMessage[] | null>(null);

  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  useEffect(() => {
    baselineRef.current = null;
    setRestored(null);
    setError(null);
  }, [threadId]);

  useEffect(() => {
    if (!replay) return;
    const controller = new AbortController();
    if (baselineRef.current === null) {
      baselineRef.current = agentRef.current.messages?.length ?? 0;
    }
    const startedWith = baselineRef.current;
    setError(null);
    void (async () => {
      try {
        const response = await fetch(
          `/api/planner/threads/${encodeURIComponent(threadId)}/messages`,
          { credentials: "include", signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setError(replayErrorMessage(response.status));
          return;
        }
        const body = (await response.json()) as {
          messages?: PlannerChatMessage[];
        };
        if (controller.signal.aborted) return;
        if ((agentRef.current.messages?.length ?? 0) > startedWith) return;
        const messages = body.messages ?? [];
        agentRef.current.setMessages(messages);
        setRestored(messages);
      } catch {
        if (controller.signal.aborted) return;
        setError("Could not load this conversation. Try again.");
      }
    })();
    return () => {
      controller.abort();
    };
  }, [threadId, retryKey, replay]);

  if (!replay) return null;

  return (
    <>
      {restored ? (
        <ol aria-label="Restored conversation" className="sr-only">
          {restored.map((message) => (
            <li key={message.id}>{message.content}</li>
          ))}
        </ol>
      ) : null}
      {error ? (
        <ErrorState
          title="Could not restore conversation"
          message={error}
          onRetry={() => setRetryKey((n) => n + 1)}
        />
      ) : null}
    </>
  );
}
