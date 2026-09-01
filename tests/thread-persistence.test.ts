import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { describe, expect, it } from "vitest";

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
