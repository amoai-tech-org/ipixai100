"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { useEffect, useRef } from "react";

import type { PlannerChatMessage } from "@/mastra/thread-types";

export function RestoreMastraHistory({ threadId }: { threadId: string }) {
  const { agent } = useAgent({ agentId: "default" });
  const agentRef = useRef(agent);
  agentRef.current = agent;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch(
        `/api/planner/threads/${encodeURIComponent(threadId)}/messages`,
        { credentials: "include" },
      );
      if (!response.ok || cancelled) return;
      const body = (await response.json()) as { messages?: PlannerChatMessage[] };
      const messages = body.messages ?? [];
      if (cancelled || messages.length === 0) return;
      agentRef.current.setMessages(messages);
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  return null;
}
