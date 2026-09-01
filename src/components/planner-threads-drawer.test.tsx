// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const agent = { messages: [] as unknown[] };

vi.mock("@copilotkit/react-core/v2", () => ({
  useAgent: () => ({ agent }),
}));

vi.mock("./ui/error-state.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

vi.mock("../app/page.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

import { PlannerThreadsDrawer } from "./planner-threads-drawer";
import { plannerThreadStorageKey } from "@/mastra/thread-types";

const rowA = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "SS26",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  agent.messages = [];
});

describe("PlannerThreadsDrawer", () => {
  it("activates the authorized stored thread, not a foreign pointer", async () => {
    window.localStorage.setItem(
      plannerThreadStorageKey("org:a::user:a"),
      "99999999-9999-4999-8999-999999999999",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          resourceId: "org:a::user:a",
          threads: [rowA],
        }),
      }),
    );
    const onThreadId = vi.fn();
    render(
      <PlannerThreadsDrawer threadId={null} onThreadId={onThreadId} />,
    );
    await waitFor(() => expect(onThreadId).toHaveBeenCalledWith(rowA.id));
    expect(screen.getByText("SS26")).toBeDefined();
  });

  it("does not mint a UUID when the thread list fails; retry stays on the same surface", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceId: "org:a::user:a",
          threads: [rowA],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const onThreadId = vi.fn();
    render(
      <PlannerThreadsDrawer threadId={null} onThreadId={onThreadId} />,
    );

    await waitFor(() => expect(screen.getByTestId("error-state")).toBeDefined());
    expect(onThreadId).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(onThreadId).toHaveBeenCalledWith(rowA.id));
    expect(onThreadId.mock.calls.every(([id]) => id === rowA.id)).toBe(true);
  });

  it("only New creates a client UUID", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          resourceId: "org:a::user:a",
          threads: [rowA],
        }),
      }),
    );
    const onThreadId = vi.fn();
    render(
      <PlannerThreadsDrawer threadId={rowA.id} onThreadId={onThreadId} />,
    );
    await waitFor(() => expect(onThreadId).toHaveBeenCalledWith(rowA.id));
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    const created = onThreadId.mock.calls.at(-1)?.[0] as string;
    expect(created).not.toBe(rowA.id);
    expect(created).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
