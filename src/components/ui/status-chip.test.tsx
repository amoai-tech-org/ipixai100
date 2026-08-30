// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

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
    render(<StatusChip dot="var(--color-info)" label="Prospect" />);
    expect(screen.getByText("Prospect").getAttribute("data-variant")).toBe("pill");
  });

  it("uses the bare variant when bare (and bare wins over onImage)", () => {
    render(<StatusChip dot="var(--color-info)" label="Prospect" bare onImage />);
    expect(screen.getByText("Prospect").getAttribute("data-variant")).toBe("bare");
  });

  it("uses the onImage variant for glassmorphism over photography", () => {
    render(<StatusChip dot="var(--color-approved)" label="Active" onImage />);
    expect(screen.getByText("Active").getAttribute("data-variant")).toBe("onImage");
  });
});
