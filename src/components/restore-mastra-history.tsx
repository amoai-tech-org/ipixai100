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

export function RestoreMastraHistory({ threadId }: { threadId: string }) {
  const { agent } = useAgent({ agentId: "default" });
  const agentRef = useRef(agent);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  useEffect(() => {
    const controller = new AbortController();
    const startedWith = agentRef.current.messages?.length ?? 0;
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
        agentRef.current.setMessages(body.messages ?? []);
      } catch {
        if (controller.signal.aborted) return;
        setError("Could not load this conversation. Try again.");
      }
    })();
    return () => {
      controller.abort();
    };
  }, [threadId, retryKey]);

  if (!error) return null;

  return (
    <ErrorState
      title="Could not restore conversation"
      message={error}
      onRetry={() => setRetryKey((n) => n + 1)}
    />
  );
}
