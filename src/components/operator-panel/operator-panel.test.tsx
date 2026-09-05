// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type MqListener = (event: MediaQueryListEvent) => void;

function mockMobileNav(matches: boolean) {
  let listener: MqListener | null = null;
  const mq = {
    matches,
    media: "(max-width: 767px)",
    addEventListener: (_event: string, cb: MqListener) => {
      listener = cb;
    },
    removeEventListener: (_event: string, cb: MqListener) => {
      if (listener === cb) listener = null;
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    emit(next: boolean) {
      this.matches = next;
      listener?.({ matches: next } as MediaQueryListEvent);
    },
    hasListener() {
      return listener !== null;
    },
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      if (!query.includes("767")) {
        return {
          matches: false,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        };
      }
      return mq;
    },
  });

  return mq;
}

vi.mock("./operator-panel.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

// @copilotkit/react-core/v2's package entry pulls in its own bundled CSS,
// which this repo's plain-node Vitest config (no CSS transform) can't load.
// Stubbed here rather than adding a project-wide CSS plugin for one test —
// these tests assert OperatorPanel's own shell/nav/rail behavior, not
// CopilotKit's internals.
vi.mock("@copilotkit/react-core/v2", () => ({
  CopilotKit: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CopilotChat: () => <div data-testid="copilot-chat-stub" />,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { OperatorPanel } from "./operator-panel";
import { navItemIsActive, OPERATOR_NAV } from "./nav";

afterEach(() => cleanup());

describe("OperatorPanel", () => {
  it("renders children, destinations, and the intelligence rail slot", () => {
    render(
      <OperatorPanel>
        <p>Workspace body</p>
      </OperatorPanel>,
    );
    expect(screen.getByTestId("operator-panel")).toBeDefined();
    expect(screen.getByText("Workspace body")).toBeDefined();
    expect(screen.getByTestId("intelligence-rail")).toBeDefined();
    // Persistent CopilotKit chat dock — center workspace, not the rail.
    expect(screen.getByTestId("operator-chat-dock")).toBeDefined();
    expect(screen.getByTestId("copilot-chat-stub")).toBeDefined();
    const plannerLinks = screen.getAllByRole("link", { name: "Open Planner" });
    expect(plannerLinks.length).toBeGreaterThan(0);
    expect(plannerLinks.every((link) => link.getAttribute("href") === "/planner")).toBe(true);
    expect(plannerLinks.every((link) => link.getAttribute("target") === "_blank")).toBe(true);
    for (const item of OPERATOR_NAV) {
      expect(screen.getByRole("link", { name: item.label })).toBeDefined();
    }
  });

  it("toggles mobile navigation open and closed", () => {
    render(
      <OperatorPanel>
        <p>Body</p>
      </OperatorPanel>,
    );
    const menu = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(menu);
    expect(screen.getByRole("button", { name: "Close menu" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(screen.getByRole("button", { name: "Menu" })).toBeDefined();
  });

  it("makes closed mobile navigation inert and restores it when open", async () => {
    mockMobileNav(true);
    render(
      <OperatorPanel>
        <p>Body</p>
      </OperatorPanel>,
    );
    const nav = document.getElementById("operator-nav");
    expect(nav).toBeTruthy();
    await waitFor(() => expect(nav?.hasAttribute("inert")).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    await waitFor(() => expect(nav?.hasAttribute("inert")).toBe(false));
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeDefined();
  });

  it("updates inert when the breakpoint changes and removes the listener on unmount", async () => {
    const mq = mockMobileNav(true);
    const { unmount } = render(
      <OperatorPanel>
        <p>Body</p>
      </OperatorPanel>,
    );
    const nav = document.getElementById("operator-nav");
    await waitFor(() => expect(nav?.hasAttribute("inert")).toBe(true));
    expect(mq.hasListener()).toBe(true);

    mq.emit(false);
    await waitFor(() => expect(nav?.hasAttribute("inert")).toBe(false));

    unmount();
    expect(mq.hasListener()).toBe(false);
  });
});

describe("navItemIsActive", () => {
  it("treats Home as exact /app only", () => {
    expect(navItemIsActive("/app", "/app")).toBe(true);
    expect(navItemIsActive("/app/brands", "/app")).toBe(false);
  });

  it("keeps nested brand routes under Brands", () => {
    expect(navItemIsActive("/app/brands/acme", "/app/brands")).toBe(true);
  });
});
