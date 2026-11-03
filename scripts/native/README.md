<!-- [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]] -->
# Native program scripts

Everything here runs with the repository's locked toolchain (Node 24, the
existing `vitest`/`tsc`) plus the verified Unreal Engine 5.7.4 install. Nothing
is downloaded and no dependency is added.

| Command | Purpose |
| --- | --- |
| `npm test` | Full suite: the existing browser tests plus rules-core, protocol, table-authority and fixture tests (vitest picks up `packages/**`, `services/**`, `scripts/native/tests/**`). |
| `npx tsc -p scripts/native/tsconfig.native.json` | Strict type-check of `packages/`, `services/` and these scripts. |
| `node scripts/native/run-ts.mjs scripts/native/generate-fixtures.ts` | Regenerates `fixtures/protocol/*.json` from one deterministic table drive. |
| `node scripts/native/run-ts.mjs scripts/native/generate-fixtures.ts --check` | Fails when the committed fixtures differ from a fresh generation. |
| `node scripts/native/run-ts.mjs services/table-authority/src/main.ts --room fixtures/protocol/dev-room.json --port 8765` | Local authority on loopback for the Unreal client. |
| `node scripts/native/verify-owned-paths.mjs --base <sha>` | Changed-file allowlist comparison for the assignment. |
| `pwsh scripts/native/build-unreal.ps1 [-Target LongTableEditor]` | UnrealBuildTool compile with the commit sha injected as `LONGTABLE_BUILD_SHA`. |
| `pwsh scripts/native/run-unreal-automation.ps1 [-Filter LongTable]` | Headless automation (`-nullrhi`) with a JSON report under `scripts/native/logs/automation-report`. |

`run-ts.mjs` uses Node's built-in type stripping and a resolve hook for the
repository's extensionless imports; it runs the same sources vitest runs.

Logs land in `scripts/native/logs/` (ignored by the root `*.log` rule).
<!-- [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]] -->
