// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setMessages = vi.fn();
const agent = { messages: [] as unknown[], setMessages };

vi.mock("@copilotkit/react-core/v2", () => ({
  useAgent: () => ({ agent }),
}));

vi.mock("./ui/error-state.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

import { RestoreMastraHistory } from "./restore-mastra-history";

const history = [
  { id: "m1", role: "user" as const, content: "alpha-fact" },
  { id: "m2", role: "assistant" as const, content: "remembered" },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setMessages.mockReset();
  agent.messages = [];
});

describe("RestoreMastraHistory", () => {
  beforeEach(() => {
    setMessages.mockReset();
    agent.messages = [];
  });

  it("hydrates ordered messages with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: history }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RestoreMastraHistory threadId="thread-a" />);

    await waitFor(() => expect(setMessages).toHaveBeenCalledWith(history));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/planner/threads/thread-a/messages",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(screen.queryByTestId("error-state")).toBeNull();
  });

  it("does not hydrate on 403 and shows a retryable denial without body leak", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: "thread_forbidden",
        secret: "ORG-A-SECRET-SHOULD-NOT-APPEAR",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RestoreMastraHistory threadId="org-a-thread" />);

    await waitFor(() => expect(screen.getByTestId("error-state")).toBeDefined());
    expect(setMessages).not.toHaveBeenCalled();
    expect(screen.queryByText(/ORG-A-SECRET/)).toBeNull();
    expect(
      screen.getByText("This conversation is not available for your organization."),
    ).toBeDefined();
  });

  it("shows retryable error on 5xx and retries fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: history }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<RestoreMastraHistory threadId="thread-a" />);

    await waitFor(() => expect(screen.getByTestId("error-state")).toBeDefined());
    expect(setMessages).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(setMessages).toHaveBeenCalledWith(history));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not overwrite live messages that arrived after hydration started", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(pending.then(() => ({
        ok: true,
        json: async () => ({ messages: history }),
      }))),
    );

    render(<RestoreMastraHistory threadId="thread-a" />);
    agent.messages = [{ id: "live", role: "user", content: "newer" }];
    resolveFetch(undefined);

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(setMessages).not.toHaveBeenCalled();
  });
});
