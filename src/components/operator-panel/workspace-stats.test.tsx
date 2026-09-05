// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import {
  ReportWorkspaceStats,
  useWorkspaceStats,
  WorkspaceStatsProvider,
} from "./workspace-stats";

afterEach(() => cleanup());

function StatsDisplay() {
  const stats = useWorkspaceStats();
  return <p>{stats ? `${stats.brandCount}/${stats.shootCount}` : "none"}</p>;
}

describe("WorkspaceStatsProvider / ReportWorkspaceStats", () => {
  it("starts with no stats reported", () => {
    render(
      <WorkspaceStatsProvider>
        <StatsDisplay />
      </WorkspaceStatsProvider>,
    );
    expect(screen.getByText("none")).toBeDefined();
  });

  it("reports real stats up to any consumer inside the same provider", () => {
    render(
      <WorkspaceStatsProvider>
        <ReportWorkspaceStats brandCount={4} shootCount={9} />
        <StatsDisplay />
      </WorkspaceStatsProvider>,
    );
    expect(screen.getByText("4/9")).toBeDefined();
  });

  it("clears stats on unmount, rather than leaving a stale value for the next route", () => {
    const { rerender } = render(
      <WorkspaceStatsProvider>
        <ReportWorkspaceStats brandCount={4} shootCount={9} />
        <StatsDisplay />
      </WorkspaceStatsProvider>,
    );
    expect(screen.getByText("4/9")).toBeDefined();

    // Unmount the reporter only (route navigated away from the dashboard) —
    // the display must fall back to "none", not keep showing "4/9".
    rerender(
      <WorkspaceStatsProvider>
        <StatsDisplay />
      </WorkspaceStatsProvider>,
    );
    expect(screen.getByText("none")).toBeDefined();
  });

  it("degrades to null outside a provider instead of throwing", () => {
    render(<StatsDisplay />);
    expect(screen.getByText("none")).toBeDefined();
  });
});
