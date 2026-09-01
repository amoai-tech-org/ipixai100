export type PlannerChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type PlannerThreadRow = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export function plannerThreadStorageKey(resourceId: string) {
  return `ipix.planner.threadId:${resourceId}`;
}

/** Prefer a stored id only when this resource listed it — never another account's UUID. */
export function resolvePlannerThreadId(
  rows: Array<{ id: string }>,
  stored: string | null,
): string {
  if (stored && rows.some((row) => row.id === stored)) return stored;
  return rows[0]?.id ?? crypto.randomUUID();
}
