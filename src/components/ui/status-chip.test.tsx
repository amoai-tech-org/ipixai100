// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Proxy stub: styles.pill → "pill", so we can assert the variant class by name.
import { vi } from "vitest";
vi.mock("./status-chip.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

import { StatusChip } from "./status-chip";

afterEach(() => cleanup());

describe("StatusChip", () => {
  it("renders the label and applies the dot color inline (token var, not hex)", () => {
    render(<StatusChip dot="var(--color-approved)" label="Active" />);
    expect(screen.getByText("Active")).toBeDefined();
    const dot = document.querySelector("[aria-hidden]") as HTMLElement;
    expect(dot.style.backgroundColor).toBe("var(--color-approved)");
  });

  it("defaults to the pill variant", () => {
    const { container } = render(<StatusChip dot="var(--color-info)" label="Prospect" />);
    expect(container.firstElementChild?.className).toContain("pill");
  });

  it("uses the bare variant when bare (and bare wins over onImage)", () => {
    const { container } = render(
      <StatusChip dot="var(--color-info)" label="Prospect" bare onImage />,
    );
    const cls = container.firstElementChild?.className ?? "";
    expect(cls).toContain("bare");
    expect(cls).not.toContain("onImage");
  });

  it("uses the onImage variant for glassmorphism over photography", () => {
    const { container } = render(
      <StatusChip dot="var(--color-approved)" label="Active" onImage />,
    );
    expect(container.firstElementChild?.className).toContain("onImage");
  });
});
