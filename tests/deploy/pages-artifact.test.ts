/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import workflow from "../../.github/workflows/prototype-ci.yml?raw";
import indexHtml from "../../index.html?raw";
import viteConfig from "../../vite.config.ts?raw";
import { LOCAL_DEVELOPMENT_BUILD } from "../../src/build-identity";

const DEPLOY_JOB_HEADER = "\n  deploy-pages:\n";

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Reads a single-quoted string constant out of the raw Vite config source. */
function configConstant(name: string): string {
  const marker = `${name} = '`;
  const start = viteConfig.indexOf(marker);
  expect(start, `vite.config.ts does not declare ${name}`).toBeGreaterThan(-1);
  const valueStart = start + marker.length;
  const end = viteConfig.indexOf("';", valueStart);
  expect(end, `vite.config.ts leaves ${name} unterminated`).toBeGreaterThan(-1);
  return viteConfig.slice(valueStart, end);
}

const deployJobStart = workflow.indexOf(DEPLOY_JOB_HEADER);
const buildJob = workflow.slice(0, deployJobStart);
const deployJob = workflow.slice(deployJobStart);

/** The accepted milestone branch whose pushes must deploy before merge to main. */
const MILESTONE_BRANCH = "milestone/accepted-webxr-prototype";

/** The deploy job's folded `if:` expression, joined the way YAML folds it. */
function deployCondition(): string {
  const marker = "\n    if: >-\n";
  const start = deployJob.indexOf(marker);
  expect(start, "deploy job has no folded if: expression").toBeGreaterThan(-1);
  const lines: string[] = [];
  for (const line of deployJob.slice(start + marker.length).split("\n")) {
    if (!line.startsWith("      ")) break;
    lines.push(line.trim());
  }
  return lines.join(" ");
}

/**
 * Evaluates the real deploy condition for a GitHub event and ref. The
 * expression is limited to string equality, &&, ||, and parentheses, so its
 * translation to JavaScript is exact.
 */
function deployAllowed(eventName: string, ref: string): boolean {
  const expression = deployCondition();
  expect(expression).toMatch(/^[\w\s()'=&|\/.-]+$/);
  const js = expression
    .replace(/github\.event_name/g, JSON.stringify(eventName))
    .replace(/github\.ref/g, JSON.stringify(ref))
    .replace(/==/g, "===");
  return Boolean(new Function(`return (${js});`)());
}

describe("stage 1 exact-artifact Pages workflow", () => {
  it("keeps a single deploy job separate from the build job", () => {
    expect(deployJobStart).toBeGreaterThan(0);
    expect(occurrences(workflow, DEPLOY_JOB_HEADER)).toBe(1);
  });

  it("preserves pull-request CI with a locked install, the full tests, and a production build", () => {
    expect(workflow).toContain("on:\n  pull_request:\n");
    expect(occurrences(workflow, "run: npm ci")).toBe(1);
    expect(occurrences(workflow, "run: npm test")).toBe(1);
    expect(occurrences(workflow, "run: npm run build")).toBe(1);
    expect(occurrences(workflow, "uses: actions/checkout@")).toBe(1);
  });

  it("builds exactly once with the full commit sha", () => {
    expect(buildJob).toContain(
      [
        "      - name: Build production bundle",
        "        env:",
        "          VITE_BUILD_SHA: ${{ github.sha }}",
        "        run: npm run build",
      ].join("\n"),
    );
    expect(occurrences(workflow, "VITE_BUILD_SHA")).toBe(1);
    expect(workflow).not.toContain("${GITHUB_SHA");
    expect(workflow).not.toContain("GITHUB_SHA:");
  });

  it("records a deterministic SHA-256 dist digest in the workflow summary", () => {
    expect(buildJob).toContain("set -euo pipefail\n          test -s dist/index.html\n");
    expect(buildJob).toContain("find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum");
    expect(buildJob).toContain('digest="$(sha256sum "${manifest}" | cut -d \' \' -f 1)"');
    expect(buildJob).toContain("${GITHUB_STEP_SUMMARY}");
  });

  it("uploads the dist that the build job already produced", () => {
    expect(buildJob).toContain(
      [
        "        uses: actions/upload-pages-artifact@v3",
        "        with:",
        "          name: github-pages",
        "          path: dist",
      ].join("\n"),
    );
    expect(buildJob.indexOf("run: npm run build")).toBeLessThan(
      buildJob.indexOf("uses: actions/upload-pages-artifact@v3"),
    );
  });

  it("deploys the uploaded artifact without a second checkout, install, test, or build", () => {
    expect(deployJob).toContain("needs: test-and-build");
    expect(deployJob).toContain(
      [
        "        uses: actions/deploy-pages@v4",
        "        with:",
        "          artifact_name: github-pages",
      ].join("\n"),
    );
    expect(deployJob).toContain("    concurrency:\n      group: github-pages\n      cancel-in-progress: false\n");
    expect(deployJob).not.toContain("actions/checkout");
    expect(deployJob).not.toContain("actions/setup-node");
    expect(deployJob).not.toContain("npm");
    expect(deployJob).not.toMatch(/^\s+run:/m);
  });

  it("routes deployment to main, the accepted milestone branch, or manual dispatch; pull requests only build and test", () => {
    const triggers = workflow.slice(0, workflow.indexOf("\njobs:\n"));
    expect(triggers).toContain("\n  pull_request:\n");
    expect(triggers).toContain(
      [
        "  push:",
        "    branches:",
        "      - main",
        `      - ${MILESTONE_BRANCH}`,
        "  workflow_dispatch:",
      ].join("\n"),
    );
    expect(deployJob).toContain("github.event_name == 'workflow_dispatch'");
    expect(deployJob).toContain("(github.event_name == 'push' && github.ref == 'refs/heads/main')");
    expect(deployJob).toContain(
      `(github.event_name == 'push' && github.ref == 'refs/heads/${MILESTONE_BRANCH}')`,
    );
    expect(deployJob).not.toContain("pull_request");
  });

  it("evaluates the deploy condition: a pull request can never deploy, a milestone push always can", () => {
    expect(deployAllowed("pull_request", "refs/pull/77/merge")).toBe(false);
    expect(deployAllowed("pull_request", "refs/heads/main")).toBe(false);
    expect(deployAllowed("pull_request", `refs/heads/${MILESTONE_BRANCH}`)).toBe(false);
    expect(deployAllowed("push", `refs/heads/${MILESTONE_BRANCH}`)).toBe(true);
    expect(deployAllowed("push", "refs/heads/main")).toBe(true);
    expect(deployAllowed("push", "refs/heads/milestone/other")).toBe(false);
    expect(deployAllowed("push", "refs/heads/feature/anything")).toBe(false);
    expect(deployAllowed("push", "refs/tags/v1")).toBe(false);
    expect(deployAllowed("workflow_dispatch", `refs/heads/${MILESTONE_BRANCH}`)).toBe(true);
    expect(deployAllowed("schedule", "refs/heads/main")).toBe(false);
  });

  it("cancels only superseded pull-request runs, never a run that may be deploying", () => {
    expect(workflow).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}");
    expect(occurrences(workflow, "cancel-in-progress: true")).toBe(0);
  });

  it("uses least-privilege permissions and the GitHub Pages environment", () => {
    expect(workflow).toContain("permissions:\n  contents: read\n");
    expect(buildJob).toContain("    permissions:\n      contents: read\n");
    expect(deployJob).toContain("    permissions:\n      pages: write\n      id-token: write\n");
    expect(deployJob).toContain("    environment:\n      name: github-pages\n");
    expect(workflow).not.toContain("write-all");
    expect(workflow).not.toContain("contents: write");
    expect(workflow).not.toContain("secrets.");
  });
});

describe("fixed build-sha HTML metadata", () => {
  const placeholder = configConstant("BUILD_SHA_PLACEHOLDER");

  it("carries the placeholder that the build replaces", () => {
    expect(placeholder).not.toHaveLength(0);
    expect(indexHtml).toContain(`<meta name="build-sha" content="${placeholder}" />`);
    expect(occurrences(indexHtml, placeholder)).toBe(1);
  });

  it("substitutes the placeholder from VITE_BUILD_SHA at build time", () => {
    expect(viteConfig).toContain("injectedSha = config.env.VITE_BUILD_SHA;");
    expect(viteConfig).toContain("transformIndexHtml(html) {");
    expect(viteConfig).toContain("injectBuildShaMetadata(html, injectedSha)");
    expect(viteConfig).toContain("html.split(BUILD_SHA_PLACEHOLDER).join(");
  });

  it("keeps the local-development fallback in step with the runtime build identity", () => {
    expect(configConstant("LOCAL_DEVELOPMENT_BUILD")).toBe(LOCAL_DEVELOPMENT_BUILD);
  });
});

describe("Pages base path", () => {
  it("stays mount-point independent so the project path and a local root both work", () => {
    expect(configConstant("PAGES_COMPATIBLE_BASE")).toBe("./");
    expect(viteConfig).toContain("base: PAGES_COMPATIBLE_BASE,");
  });
});
