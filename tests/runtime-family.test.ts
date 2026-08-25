import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

function versionTuple(version: string): [number, number, number] {
  const core = version.split("-")[0] ?? "0.0.0";
  const [major = 0, minor = 0, patch = 0] = core.split(".").map((n) => Number.parseInt(n, 10));
  return [major, minor, patch];
}

function compareVersion(
  a: [number, number, number],
  b: [number, number, number],
): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** Matches npm peers like `>=1.34.0-0 <2.0.0-0`. Pre-release suffixes are ignored. */
function coreSatisfiesMastraPeer(coreVersion: string, peerRange: string): boolean {
  const match = peerRange.match(/^>=\s*([0-9][^\s]*)\s+<\s*([0-9][^\s]*)$/);
  if (!match?.[1] || !match[2]) return false;
  const version = versionTuple(coreVersion);
  return (
    compareVersion(version, versionTuple(match[1])) >= 0 &&
    compareVersion(version, versionTuple(match[2])) < 0
  );
}

describe("IPI-1042 runtime family", () => {
  it("installs a peer-compatible @mastra/pg package without wiring storage", () => {
    const pkg = require("@mastra/pg/package.json") as {
      name: string;
      version: string;
      peerDependencies?: { "@mastra/core"?: string };
    };

    expect(pkg.name).toBe("@mastra/pg");
    expect(pkg.version).toBe("1.12.1");
    const peer = pkg.peerDependencies?.["@mastra/core"];
    expect(peer).toBeTruthy();
    expect(coreSatisfiesMastraPeer("1.41.0", peer ?? "")).toBe(true);
    expect(coreSatisfiesMastraPeer("1.41.0", ">=1.34.0-0 <1.41.0")).toBe(false);
  });

  it("can import @mastra/pg against @mastra/core@1.41.0", async () => {
    const mod = await import("@mastra/pg");
    expect(typeof mod.PostgresStore).toBe("function");
  });
});
