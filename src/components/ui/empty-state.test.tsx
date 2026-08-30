// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("./empty-state.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

import { EmptyState } from "./empty-state";

afterEach(() => cleanup());

describe("EmptyState", () => {
  it("renders heading, body, CTA slot, and hint", () => {
    render(
      <EmptyState
        heading="No companies yet"
        body="Add your first company to get started."
        action={<a href="/app/crm/companies/new">Add company</a>}
        hint="Concierge can import companies from a CSV."
      />,
    );
    expect(screen.getByText("No companies yet")).toBeDefined();
    expect(screen.getByText("Add your first company to get started.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Add company" })).toBeDefined();
    expect(screen.getByText("Concierge can import companies from a CSV.")).toBeDefined();
  });

  it("renders the icon variant when given an icon and no preview", () => {
    render(<EmptyState heading="Empty" icon={<svg data-testid="the-icon" />} />);
    expect(screen.getByTestId("empty-state").getAttribute("data-visual")).toBe("icon");
    expect(screen.getByTestId("the-icon")).toBeDefined();
    expect(screen.queryByTestId("empty-state-preview")).toBeNull();
  });

  it("prefers the preview fan over the icon when both are supplied", () => {
    render(
      <EmptyState heading="Empty" preview={<div>photos</div>} icon={<svg data-testid="the-icon" />} />,
    );
    expect(screen.getByTestId("empty-state").getAttribute("data-visual")).toBe("preview");
    expect(screen.getByText("photos")).toBeDefined();
    expect(screen.queryByTestId("the-icon")).toBeNull();
  });

  it("omits optional slots when not provided", () => {
    render(<EmptyState heading="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeDefined();
    // no CTA / hint rendered
    expect(screen.queryByRole("link")).toBeNull();
  });
});
