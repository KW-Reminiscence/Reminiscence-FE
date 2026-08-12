import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const dockerfile = readFileSync(resolve(process.cwd(), "Dockerfile"), "utf8");
const nginx = readFileSync(resolve(process.cwd(), "deploy/nginx.conf"), "utf8");

describe("web container deployment", () => {
  it("serves the production bundle from a non-root runtime", () => {
    expect(dockerfile).toContain("RUN pnpm build");
    expect(dockerfile).toContain("nginxinc/nginx-unprivileged");
    expect(dockerfile).toContain("USER nginx");
    expect(dockerfile).toContain("EXPOSE 8080");
    expect(dockerfile).not.toMatch(/COPY .*data/i);
    expect(dockerfile).not.toMatch(/COPY .*secret/i);
  });

  it("uses an explicit health endpoint and SPA fallback", () => {
    expect(nginx).toContain("location = /healthz");
    expect(nginx).toContain("try_files $uri $uri/ /index.html");
    expect(nginx).toContain("max-age=31536000, immutable");
    expect(nginx).toContain('Cache-Control "no-cache, no-store, must-revalidate"');
  });

  it("applies browser security headers including microphone policy", () => {
    expect(nginx).toContain("Content-Security-Policy");
    expect(nginx).toContain("X-Content-Type-Options");
    expect(nginx).toContain("Referrer-Policy");
    expect(nginx).toContain("microphone=(self)");
  });
});
