<!-- [[Codex | GPT-5.6 | 2026-08-25 | 03:02 UTC | BEGIN]] -->
# Claude assignment — LT-ENG-CLAUDE-01

- Repository: `edwardjones3976/long-table-bid-whist`
- Worktree: current explicit ChatGPT project worktree
- Branch/base: `main` / `510a4229ccc4295685333581826e67346482e2e3`
- Lane: implementation
- Goal: build a fresh deterministic Strict Table Bid Whist domain engine and
  tests from retained notes, without reading or reusing the quarantined prior
  implementation.
- Owned files: `src/game/model.ts`, `src/game/engine.ts`, `src/game/ai.ts`,
  `src/game/index.ts`, `tests/game/engine.test.ts`
- Read-only inputs: `docs/prototype-acceptance.md`, `director/intake.md`, and the
  applicable sections of `director/research/2026-08-24-foundation-research.md`.
- Forbidden: `_restart_archive/**`, `sources/**`, every non-owned file, commits,
  pushes, external messages, credentials, network calls, and unrelated work.
- Required behavior: seeded 54-card deal; four fixed seats; one-round legal
  auction with forced dealer; High/Low/No-Trump declaration; six-card kitty and
  discard; follow-suit enforcement; twelve tricks; books/scoring; deterministic
  AI using only its legal-information view; next-hand restart; public digest.
- UI-facing contract: one immutable state plus `newTable`, `legalHumanActions`,
  `applyHumanAction`, and deterministic AI advancement that stops at the next
  South decision or summary.
- Acceptance: focused tests prove uniqueness, determinism, auction legality,
  hidden-information view, follow suit, complete-hand reachability, scoring,
  and next-hand availability. Run the focused test file and report exact result.
- Handoff: OpenAI Director integrates; Claude has no acceptance, merge, deploy,
  publication, or Slack authority.
<!-- [[Codex | GPT-5.6 | 2026-08-25 | 03:02 UTC | END]] -->
