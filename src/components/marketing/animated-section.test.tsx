// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnimatedSection } from "./animated-section";

afterEach(() => {
  cleanup();
});

describe("AnimatedSection (IPI-1057)", () => {
  it("reveals immediately when IntersectionObserver is unavailable", () => {
    const original = globalThis.IntersectionObserver;
    // @ts-expect-error — simulate an unsupported browser
    delete globalThis.IntersectionObserver;

    try {
      const { container } = render(<AnimatedSection>content</AnimatedSection>);
      expect(container.querySelector("[data-shown]")?.getAttribute("data-shown")).toBe("true");
    } finally {
      if (original) {
        globalThis.IntersectionObserver = original;
      }
    }
  });
});