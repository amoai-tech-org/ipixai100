import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { describe, expect, it } from "vitest";

import {
  plannerThreadStorageKey,
  resolvePlannerThreadId,
} from "../src/mastra/thread-types";
import {
  ensureMastraThread,
  listMastraThreadsForResource,
  mastraMessagesToChat,
  splitRunThreadIds,
} from "../src/mastra/thread-persistence";

function isolatedMemory() {
  return new Memory({
    storage: new LibSQLStore({
      id: `thread-persist-${crypto.randomUUID()}`,
      url: ":memory:",
    }),
  });
}

describe("splitRunThreadIds", () => {
  it("keeps the CopilotKit thread id for Mastra and prefixes only the abort store", () => {
    const clientThreadId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const resourceId = "org:org-a::user:user-a";
    expect(splitRunThreadIds(resourceId, clientThreadId)).toEqual({
      runnerThreadId: `${resourceId}\u001f${clientThreadId}`,
      mastraThreadId: clientThreadId,
    });
  });
});

describe("ensureMastraThread + listMastraThreadsForResource", () => {
  it("creates a thread on first run and lists it for that resourceId", async () => {
    const memory = isolatedMemory();
    const threadId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const resourceId = "org:org-a::user:user-a";

    const first = await ensureMastraThread(memory, { threadId, resourceId });
    expect(first.created).toBe(true);

    const second = await ensureMastraThread(memory, { threadId, resourceId });
    expect(second.created).toBe(false);

    const listed = await listMastraThreadsForResource(memory, resourceId);
    expect(listed.map((thread) => thread.id)).toEqual([threadId]);

    const other = await listMastraThreadsForResource(
      memory,
      "org:org-b::user:user-b",
    );
    expect(other).toEqual([]);

    await expect(
      ensureMastraThread(memory, {
        threadId,
        resourceId: "org:org-b::user:user-b",
      }),
    ).rejects.toThrow("thread belongs to another resource");
  });

  it("lists more than 50 threads for one resource", async () => {
    const memory = isolatedMemory();
    const resourceId = "org:org-a::user:user-a";
    const ids = Array.from({ length: 52 }, (_, index) =>
      `cccccccc-cccc-4ccc-8ccc-${index.toString().padStart(12, "0")}`,
    );
    for (const threadId of ids) {
      await ensureMastraThread(memory, { threadId, resourceId });
    }
    const listed = await listMastraThreadsForResource(memory, resourceId);
    expect(listed).toHaveLength(52);
  });
});

describe("resolvePlannerThreadId", () => {
  const rowA = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
  const rowB = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" };
  const orphan = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  it("uses the stored id when it is in the listed rows", () => {
    expect(resolvePlannerThreadId([rowA, rowB], rowB.id)).toBe(rowB.id);
  });

  it("uses the first listed row when the stored id is absent", () => {
    expect(resolvePlannerThreadId([rowA, rowB], orphan)).toBe(rowA.id);
  });

  it("does not reuse a stored id when the list is empty", () => {
    const next = resolvePlannerThreadId([], orphan);
    expect(next).not.toBe(orphan);
    expect(next).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("generates an id when there are no rows and no stored id", () => {
    const next = resolvePlannerThreadId([], null);
    expect(next).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("scopes localStorage keys to the signed-in resource", () => {
    expect(plannerThreadStorageKey("org:a::user:u")).toBe(
      "ipix.planner.threadId:org:a::user:u",
    );
  });
});

describe("mastraMessagesToChat", () => {
  it("keeps user and assistant text for CopilotKit setMessages", () => {
    expect(
      mastraMessagesToChat([
        {
          id: "m1",
          role: "user",
          content: {
            content: "PERSIST-OK-0901",
            parts: [{ type: "text", text: "PERSIST-OK-0901" }],
          },
        },
        {
          id: "m2",
          role: "assistant",
          content: {
            content: "saved",
            parts: [{ type: "text", text: "saved" }],
          },
        },
        {
          id: "m3",
          role: "tool",
          content: { content: "ignore", parts: [] },
        },
      ]),
    ).toEqual([
      { id: "m1", role: "user", content: "PERSIST-OK-0901" },
      { id: "m2", role: "assistant", content: "saved" },
    ]);
  });
});
