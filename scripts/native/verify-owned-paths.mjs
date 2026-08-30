// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Changed-file allowlist comparison for assignment LT-NATIVE-CLAUDE-001.
 *
 *   node scripts/native/verify-owned-paths.mjs [--base <sha>] [--head <ref>]
 *
 * Lists every path changed between base and head (plus uncommitted and
 * untracked paths) and fails when any of them falls outside the owned
 * allowlist. Matching is a segment-by-segment glob with `**`; no regular
 * expression is involved.
 */
import { execFileSync } from "node:child_process";

export const OWNED_PATHS = [
  "Unreal/LongTable.uproject",
  "Unreal/Config/**",
  "Unreal/Source/LongTable/**",
  "Unreal/Source/LongTableProtocol/**",
  "Unreal/Source/LongTableTable/**",
  "Unreal/LongTable.Target.cs",
  "Unreal/LongTableEditor.Target.cs",
  "packages/rules-core/**",
  "packages/protocol/**",
  "services/table-authority/**",
  "fixtures/protocol/**",
  "scripts/native/**",
  ".github/workflows/native-ci.yml",
];

/**
 * Documented deviations from the packet's literal allowlist. The packet names
 * Unreal/LongTable.Target.cs and Unreal/LongTableEditor.Target.cs at the
 * project root, but UnrealBuildTool only discovers target rules beneath
 * <Project>/Source and only treats the project as code-based when they sit
 * directly in that folder. The files therefore live one level down, at the
 * engine-required location, and are reported separately here.
 */
export const DOCUMENTED_DEVIATIONS = [
  "Unreal/Source/LongTable.Target.cs",
  "Unreal/Source/LongTableEditor.Target.cs",
];

export const PROHIBITED_PATHS = [
  "sources/**",
  "director/**",
  "Unreal/Source/LongTableXR/**",
  "Unreal/Content/Input/**",
  "Unreal/Content/Presence/**",
  "Unreal/Content/Environment/**",
  "services/session-gateway/**",
  "Unreal/Source/LongTableSocial/**",
  "Unreal/Content/Social/**",
  "Unreal/Plugins/LongTableHouseCore/**",
  "Unreal/Plugins/MetaXR/**",
  "Unreal/Plugins/MetaXRInteraction/**",
];

function segmentsMatch(patternSegments, pathSegments) {
  if (patternSegments.length === 0) return pathSegments.length === 0;
  const [head, ...rest] = patternSegments;
  if (head === "**") {
    for (let skip = 0; skip <= pathSegments.length; skip += 1) {
      if (segmentsMatch(rest, pathSegments.slice(skip))) return true;
    }
    return false;
  }
  if (pathSegments.length === 0) return false;
  return head === pathSegments[0] && segmentsMatch(rest, pathSegments.slice(1));
}

export function matchesPattern(pattern, path) {
  return segmentsMatch(pattern.split("/"), path.split("/"));
}

export function classify(path) {
  if (PROHIBITED_PATHS.some((pattern) => matchesPattern(pattern, path))) return "prohibited";
  if (OWNED_PATHS.some((pattern) => matchesPattern(pattern, path))) return "owned";
  if (DOCUMENTED_DEVIATIONS.includes(path)) return "deviation";
  return "outside";
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : fallback;
}

export function changedPaths(base, head) {
  const committed = git(["diff", "--name-only", "--diff-filter=ACDMR", `${base}..${head}`])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const working = git(["status", "--porcelain", "--untracked-files=all"])
    .split("\n")
    .filter((line) => line.length > 3)
    .map((line) => line.slice(3).trim())
    .map((entry) => (entry.includes(" -> ") ? entry.split(" -> ")[1] : entry))
    .filter(Boolean);
  return [...new Set([...committed, ...working])].sort();
}

function main() {
  const base = argumentValue("--base", "72d2fd7224e58dee58f2c3d36d4d890ce9ede0bb");
  const head = argumentValue("--head", "HEAD");
  const paths = changedPaths(base, head);
  const rows = paths.map((path) => ({ path, verdict: classify(path) }));
  for (const row of rows) process.stdout.write(`${row.verdict.padEnd(10)} ${row.path}\n`);
  const deviations = rows.filter((row) => row.verdict === "deviation");
  const violations = rows.filter((row) => row.verdict === "outside" || row.verdict === "prohibited");
  process.stdout.write(
    `\n${rows.length} changed path(s); ${deviations.length} documented deviation(s); ${violations.length} outside the owned allowlist\n`,
  );
  if (violations.length > 0) process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].replaceAll("\\", "/").endsWith("scripts/native/verify-owned-paths.mjs")) {
  main();
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
