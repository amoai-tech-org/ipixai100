"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { useEffect, useRef } from "react";

import type { PlannerChatMessage } from "@/mastra/thread-types";

export function RestoreMastraHistory({ threadId }: { threadId: string }) {
  const { agent } = useAgent({ agentId: "default" });
  const agentRef = useRef(agent);

  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  useEffect(() => {
    const controller = new AbortController();
    const startedWith = agentRef.current.messages?.length ?? 0;
    void (async () => {
      try {
        const response = await fetch(
          `/api/planner/threads/${encodeURIComponent(threadId)}/messages`,
          { credentials: "include", signal: controller.signal },
        );
        if (!response.ok || controller.signal.aborted) return;
        const body = (await response.json()) as {
          messages?: PlannerChatMessage[];
        };
        if (controller.signal.aborted) return;
        if ((agentRef.current.messages?.length ?? 0) > startedWith) return;
        agentRef.current.setMessages(body.messages ?? []);
      } catch {
        if (controller.signal.aborted) return;
      }
    })();
    return () => {
      controller.abort();
    };
  }, [threadId]);

  return null;
}
