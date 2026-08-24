import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("IPI-1042 runtime family", () => {
  it("installs a peer-compatible @mastra/pg package without wiring storage", () => {
    const pkg = require("@mastra/pg/package.json") as {
      name: string;
      version: string;
      peerDependencies?: { "@mastra/core"?: string };
    };

    expect(pkg.name).toBe("@mastra/pg");
    expect(pkg.peerDependencies?.["@mastra/core"]).toMatch(/1\.34\.0/);
  });
});
