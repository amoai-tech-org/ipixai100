// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

function mockMobileNav(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("767") ? matches : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

vi.mock("./operator-panel.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
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
    const plannerLinks = screen.getAllByRole("link", { name: "Open Planner" });
    expect(plannerLinks.length).toBeGreaterThan(0);
    expect(plannerLinks.every((link) => link.getAttribute("href") === "/")).toBe(true);
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
    expect(screen.getByRole("link", { name: "Home" })).toBeDefined();
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
