import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);

describe("web CI workflow", () => {
  it("runs every quality gate on GitHub-hosted infrastructure", () => {
    expect(workflow).toContain("runs-on: ubuntu-latest");
    expect(workflow).not.toContain("self-hosted");
    expect(workflow).toContain("pnpm api:check");
    expect(workflow).toContain("pnpm test");
    expect(workflow).toContain("pnpm lint");
    expect(workflow).toContain("pnpm typecheck");
    expect(workflow).toContain("pnpm test:e2e");
  });

  it("publishes ARM64 images only after verification", () => {
    expect(workflow).toContain("needs: verify");
    expect(workflow).toContain("if: github.event_name == 'push'");
    expect(workflow).toContain("platforms: linux/arm64");
    expect(workflow).toContain("ghcr.io/kw-reminiscence/reminiscence-fe");
    expect(workflow).toContain("provenance: mode=max");
    expect(workflow).toContain("sbom: true");
  });
});
