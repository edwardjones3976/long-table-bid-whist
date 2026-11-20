<!-- [[OpenAI Director | GPT-5.6 | 2026-08-26 | 03:02 UTC | BEGIN]] -->
<!-- [[OpenAI Director | GPT-5.6 | 2026-08-26 | 02:49 UTC | BEGIN]] -->
# Stage 1 workload addendum — Claude and Grok activation

## Owner reshape

The owner directed the Stage 1 execution cycle to include both Claude and Grok.
This addendum applies the current `director-orchestrator` bootstrap protocol to
that request without creating conflicting writers or inflating the canonical
100-unit workload denominator.

The standing direct-production target remains:

| Lane | Canonical target | Stage 1 activation |
| --- | ---: | --- |
| Claude | 60 units | Active clean-room implementation writer after Cursor's incomplete run was quarantined |
| Cursor | 28 units | Incomplete writer attempt receives zero credit; later exact-SHA review is eligible only if no partial code is adopted; 8 units remain suballocated to Grok QA |
| Gemini/Antigravity | 7 units | Unchanged; no authenticated Stage 1 artifact yet |
| Perplexity | 4 units | Prior research packet remains credited; no duplicate query |
| External OpenAI/Codex | 1 unit | No new product-writing unit; Director work remains excluded overhead |

Grok is a named model/operator inside the Cursor workload lane for accounting
purposes. Its 8-unit suballocation is not additive: Cursor Agent and Grok
together may receive at most the existing 28 Cursor-lane units.

No provider receives credit for an attempt, unavailable session, rejected
artifact, duplicated work, or output that does not satisfy its packet.

## Active packets

### `LT-CURSOR-S1-XR-001` — Cursor Agent writer attempt

- **Worktree:** `_provider_worktrees/cursor-stage1-xr`
- **Base:** `34de519fbe00110eadac911b55efd3b4475a5b35`
- **Scope:** shared semantic intents, safe XR projection/port, Three.js Quest
  controller path, calibration/lifecycle, focused tests, and build identity.
- **Observed result:** authenticated run produced an uncommitted partial patch,
  then the provider connection failed after ten automatic retries. The partial
  worktree is preserved and quarantined; it will not be cherry-picked, copied,
  or credited.
- **Status:** `UNAVAILABLE`; zero credited units. No duplicate Cursor dispatch
  occurs before the failed run is reconciled.

### `LT-CLAUDE-S1-XR-002` — Claude clean-room writer

- **Worktree:** `_provider_worktrees/claude-stage1-xr`
- **Base:** `34de519fbe00110eadac911b55efd3b4475a5b35`
- **Scope:** implement the same bounded Stage 1 interaction, structural XR
  projection, Three.js controller/calibration/lifecycle, build identity, and
  focused-test packet from the clean base.
- **Isolation:** Claude may not read or import the quarantined Cursor worktree.
- **Limit:** sole product writer; no self-review, push, deployment, merge,
  external post, or physical-Quest claim.
- **Provisional units:** 12 toward Claude's standing target, credited only after
  a tested committed handoff.

### `LT-GROK-S1-QA-001` — Grok adversarial QA

- **Dependency:** frozen Claude candidate SHA.
- **Scope:** read-only diff inspection; reproduce tests/build; challenge
  exactly-once behavior, structural concealed-state isolation, session cleanup,
  controller parity, calibration bounds, and product-label claims.
- **Output:** exact findings and reproduced commands; advisory only.
- **Limit:** no edits, commit, push, review acceptance, external post, merge,
  deployment, or scope expansion.
- **Provisional units:** 8 from the Cursor lane, credited only if the evidence
  packet is attributable and materially useful.

### `LT-CURSOR-S1-REVIEW-002` — Cursor exact-SHA reviewer

- **Dependency:** independently produced Claude candidate plus Grok's advisory
  QA packet; Cursor must first regain a stable authenticated connection.
- **Scope:** independent repository-grounded review of the exact candidate,
  focused tests/build, privacy boundary, lifecycle, restricted rules, and the
  claimed Stage 1 label.
- **Output:** `ACCEPT`, `CHANGES_REQUIRED`, or `SERIOUS_SAFETY_STOP`, bound to
  the 40-character SHA with files and exact tests.
- **Limit:** read-only for the review cycle; no partial Cursor code may have
  entered the candidate; no self-authored fix, push, merge,
  deployment, Slack/Linear/GitHub post, or physical-evidence substitution.
- **Provisional units:** 8 toward Cursor's standing target, credited only after
  a complete exact-SHA review packet.

## Sequence and fallback

`CLAUDE WRITES CLEAN → FREEZE SHA → GROK QA → CURSOR INDEPENDENT REVIEW → DIRECTOR RECONCILIATION`

## 2026-08-29 continuation gate

- The rolling assignment window was reassessed before continuation. Resuming
  `LT-CLAUDE-S1-XR-002` is recovery attempt 1 for the same 12-unit packet, not
  a new assignment, so it does not change the standing 60/28/7/4/1 allocation
  or create duplicate direct-work credit.
- The normal tolerance is target plus or minus 3 percentage points and the
  hard ceiling is target plus 5 percentage points. No provider allocation is
  increased by this recovery; Claude remains capped at its existing 60-unit
  program lane and the incomplete packet remains at zero credited units.
- The primary Claude run left attributable files but no commit, terminal
  result, tests, or completion packet after the controlling session was
  interrupted. One same-session, same-worktree recovery is permitted. A
  further same-transport attempt is prohibited unless materially new evidence
  or a genuinely different transport is recorded.
- Status checks are consolidated: inspect the terminal result once, then run
  one combined candidate/test/build reconciliation. No duplicate dispatch or
  duplicate validation is authorized.
- The combined reconciliation produced materially new evidence: diff hygiene
  and the production build passed, while the suite reported 28 passing tests
  and one stale `STRICT_TABLE_V1` copy assertion; the required Stage 1 tests
  and local commit were still absent. The owner then explicitly directed an
  immediate Claude relaunch. Attempt 3 is therefore permitted by the new-
  information exception, remains bound to the same assignment/worktree, and
  is the final attempt for this route.

## Frozen-candidate execution result

- `LT-CLAUDE-S1-XR-002` completed on attempt 3 at
  `bb94bbd65c1c551b02b0e99937037a5c14161548`. The worktree is clean; Claude's
  attributable packet reports 85 of 85 tests passing and a successful
  production build. Its 12 provisional units are now credited.
- `LT-GROK-S1-QA-001` produced no valid QA packet. The primary CLI actor exited
  unexpectedly. Recovery 1 ended `cancelled` because plan mode required a
  write that conflicted with the read-only packet and reported `$0.037234`.
  The materially different final attempt used an isolated detached worktree
  and non-plan transport, but also ended `cancelled` before inspecting the
  candidate and reported `$0.063316`. The primary attempt reported no cost, so
  none is inferred. Grok is `UNAVAILABLE`, receives zero units, and may not be
  dispatched again for this packet.
- The next eligible action is the already planned 8-unit
  `LT-CURSOR-S1-REVIEW-002` exact-SHA review. It is not a new allocation and
  cannot read or adopt Cursor's quarantined writer patch.
- A routing collision was found before the canonical review: the generic
  `agent` command resolved to `<local path removed>`, not Cursor.
  Its incomplete output is rejected as both Cursor and Grok evidence, receives
  zero credit, and reported no cost. The canonical Cursor invocation used the
  explicit `<local path removed>` transport.
- Cursor's primary exact-SHA review returned `UNAVAILABLE` because its shell
  lane could not run Git, tests, or the build, but it delivered a substantive
  static inspection. The Director then verified the exact head, base ancestry,
  clean worktree before/after, `npm ci` with zero vulnerabilities, 85 of 85
  tests, and the production build in one consolidated closeout. Cursor recovery
  1 reconciled that evidence and returned `ACCEPT` bound to
  `bb94bbd65c1c551b02b0e99937037a5c14161548`; its 8 units are credited.
- `LT-AGY-S1-01` was attempted as a closed synthetic, sandboxed plan-mode
  fixture with no repository context. The actual attempt and one recovery both
  terminated before model execution with zero input, output, thinking, and
  cache tokens. The Antigravity skill's fail-soft rule ends the route without a
  duplicate dispatch. Antigravity is `UNAVAILABLE` and receives zero units.
- The direct-production ledger is now 45 credited units: Claude 24, Cursor 16,
  Gemini/Antigravity 0, Perplexity 4, and external OpenAI/Codex 1. Normalized
  interim credited shares put Cursor at 35.6 percent, above its 33 percent hard
  ceiling, so no further Cursor assignment is eligible in the next rolling
  window. Claude and Antigravity remain the under-target lanes.
- GitHub draft PR #1 is green at the exact accepted head. A real-browser pass
  verified fresh identity, AI Dealer and Human Host setup, preview/cancel,
  double-confirm safety, host/no-music/no-network boundaries, accessibility
  preferences, 390/1024/1672 responsive layouts, and keyboard-only entry plus
  preview/cancel. The only console error was a non-functional favicon 404; no
  dynamic network requests were observed. Physical Quest and human gates remain
  open.

The providers run sequentially to preserve one-writer ownership and avoid
duplicated ambiguous dispatch. If Grok is unavailable, Cursor review proceeds
and Grok receives zero credit. If Cursor review remains unavailable, the
candidate remains unaccepted and draft; Grok does not substitute for the
canonical reviewer. A candidate change invalidates both packets and restarts
exact-SHA evidence.
<!-- [[OpenAI Director | GPT-5.6 | 2026-08-26 | 02:49 UTC | END]] -->
<!-- [[OpenAI Director | GPT-5.6 | 2026-08-26 | 03:02 UTC | END]] -->
