export type PlannerAuthState = "loading" | "signed-out" | "signed-in";

export type CopilotHandshake = {
  mountCopilotKit: boolean;
  expectedInfoStatus: 200 | 401 | null;
};

/** Unsigned /info stays 401. CopilotKit mounts only after a verified session. */
export function copilotHandshake(state: PlannerAuthState): CopilotHandshake {
  if (state === "loading") {
    return { mountCopilotKit: false, expectedInfoStatus: null };
  }
  if (state === "signed-out") {
    return { mountCopilotKit: false, expectedInfoStatus: 401 };
  }
  return { mountCopilotKit: true, expectedInfoStatus: 200 };
}

export function infoListsDefaultAgent(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const agents = (body as { agents?: unknown }).agents;
  if (Array.isArray(agents)) {
    return agents.some((agent) => {
      if (!agent || typeof agent !== "object") return false;
      return (agent as { name?: unknown }).name === "default";
    });
  }
  if (agents && typeof agents === "object") {
    const record = agents as Record<string, { name?: unknown } | undefined>;
    return (
      record.default?.name === "default" ||
      Object.prototype.hasOwnProperty.call(record, "default")
    );
  }
  return false;
}
