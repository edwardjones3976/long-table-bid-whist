<!-- [[OpenAI Director | Codex | 2026-08-30 | 09:00 UTC | BEGIN]] -->
# PR76 workload-adoption baseline

## Decision

This signed baseline admits only assignment rows that have a stable assignment
identity, immutable canonical effort points, authenticated or directly observed
provider execution, a terminal disposition, and an evidence path. It preserves
all older workload claims but does not convert legacy units into PR76 points or
invent missing rows.

The earlier accepted-direct-production aggregate says Claude 24, Cursor 16,
Perplexity 4 and external OpenAI/Codex 1, for 45 legacy units. Current project
records can individually attribute only Claude 12, Cursor 8, Perplexity 4 and
external OpenAI/Codex 1, for 25 legacy units. The remaining Claude 12 and Cursor
8 have no recoverable assignment IDs, order, canonical size, authenticated run,
or accepted-outcome binding in the current repository evidence.

Those 20 aggregate-only units are therefore marked irrecoverable for canonical
accounting and excluded. The complete 45-unit claim remains visible as legacy
evidence; nothing is deleted, rewritten, reassigned or credited twice.

## Canonical window

The PR76 canonical rolling series begins with the first native-program packets:

1. `LT-NATIVE-CLAUDE-001` — Claude, long/8, authenticated execution,
   `CHANGES_REQUIRED`, zero direct-production credit.
2. `LT-NATIVE-ANTIGRAVITY-001` — Gemini Antigravity, long/8, authenticated
   execution and exhausted recovery, quarantined, zero direct-production
   credit.
3. `LT-NATIVE-CLAUDE-001-R1` is not completed effort: authenticated Claude
   executed two read-only inspection tools, then hit its temporary session cap
   before any source mutation. The same assignment remains queued for one
   transient recovery at the exact reset, with zero completed-window and
   direct-production points until a terminal outcome exists.
4. `LT-NATIVE-GROK-HOUSE-001` reached authenticated provider execution, but its
   configured browser fallback is still blocked at a human-only legal
   acknowledgement. The assignment is not terminal and does not enter the
   completed rolling window yet.
5. `LT-NATIVE-ANTIGRAVITY-002` — Gemini Antigravity, short/2, authenticated
   provider execution, terminal `UNAVAILABLE` after its configured sandbox
   policy denied writes and local commands, zero direct-production credit.
6. `LT-NATIVE-CURSOR-XRCORE-001` — Cursor, medium/5, authenticated execution
   and exact candidate `72a805f`, terminal `CHANGES_REQUIRED` after OpenAI
   reproduced an Unreal editor-build failure and ten consolidated findings,
   zero direct-production credit.
7. `LT-NATIVE-CURSOR-XRCORE-001-R1` — Cursor, medium/5, authenticated final
   revision execution and exact mechanically frozen candidate `de02a26`,
   terminal `CHANGES_REQUIRED_REVISION_EXHAUSTED` after OpenAI reproduced an
   Unreal C++ build failure and retained substantive contract and test defects,
   zero direct-production credit.

The exact `director-orchestrator@cc791364e2f1ff1ac4c72e01c7122296e4ff7362`
enforcer activates rolling hard thresholds only with a complete 20-assignment
window. At five completed rows it reports `rolling_window_warming_up:5/20`.
Accordingly, this baseline reports the current effort-weighted partial 28.57%
Claude / 35.71% Cursor / 35.71% Antigravity distribution as severe drift, not
as a pass and not as a hard-cap calculation over a fictitious complete window.

## Routing correction

Useful, dependency-ready work routes toward under-target providers while the
window warms:

- Grok receives the independent clean-room HouseCore packet first.
- Claude R1 resumes only after its exact provider reset; it is a required
  correction of Claude's existing authority candidate, not filler.
- Cursor's broad integration packet remains dependency-bound. Its new isolated
  self-registering XR-core plugin packet is dependency-independent,
  product-required, and dispatchable to the currently under-target Cursor lane.
- Cursor's one XR-core revision reached terminal OpenAI rejection at `de02a26`.
  Its revision budget is exhausted; no further Cursor correction or final
  integration may be silently dispatched as a retry.
- Antigravity's robot-dealer assignment was dispatched only after the
  under-target Grok route. It terminated unavailable with zero code because its
  configured sandbox policy denied writes and commands. It contributes one
  completed overall-effort row but no direct-production artifact or credit.

Every future completion appends immutable overall-effort points. Only an exact
OpenAI-accepted production outcome appends the same points to the separate
direct-production ledger. Failed provider work remains overall effort only;
pre-execution transport failures remain zero.

## Evidence and exclusions

The reconstruction used current records under `director/**` and
`artifacts/native-program/**`. Committee turns, advisory Chrome reviews, legacy
research, unavailable transports and old aggregate credits remain excluded from
the canonical window when they lack any required identity or immutable point
field. Firecrawl is a tool, never a workforce provider. A transport recovery
inside one packet stays inside its original assignment. An immutable provider
revision with its own pre-staged assignment ID, as used for Claude R1 and Cursor
XR R1, is one separately ordered canonical assignment and cannot be split or
counted again.

This baseline is not permission to merge, release, spend, accept licenses,
access accounts, claim device/human/store completion, or relax one-writer,
privacy, security, exact-candidate or OpenAI QA gates.

<!-- [[OpenAI Director | Codex | 2026-08-30 | 09:00 UTC | END]] -->

<!-- [[OpenAI Director | Codex | 2026-08-30 | 11:30 UTC | BEGIN]] -->
## Terminal addendum

Claude R1 is now terminal at exact candidate `816824e`, tree `df89b69`, after
its one temporary same-session recovery. The provider returned a schema-valid
`SUCCEEDED` result; OpenAI independently reproduced green TypeScript and Unreal
gates and then rejected twelve source-review defects. Sequence 3 therefore
enters the completed overall-effort window at long/8 and remains zero accepted
direct-production credit.

The current completed window is 9 of 20 and 54 points: Claude 16 (29.63%),
Cursor 20 (37.04%), Grok 8 (14.81%), Gemini Antigravity 10 (18.52%), OpenAI 0
and Perplexity 0. Exact PR76 enforcement still reports warm-up; this is not a
rolling compliance pass.

One separately identified medium/5 Claude foundation assignment is permitted
only because the terminal review supplied materially new information. It is
followed sequentially by the already-frozen XR test-only and RobotDealer
fallback packets. Projected Claude shares are 35.59%, 40.63% and 44.93%
respectively. The final projection exceeds the project's stricter 41% planning
ceiling during warm-up; execute only genuine dependency work, record the
variance honestly, and never create filler or duplicate research to alter the
denominator.
<!-- [[OpenAI Director | Codex | 2026-08-30 | 11:30 UTC | END]] -->

<!-- [[OpenAI Director | Codex | 2026-08-30 | 12:30 UTC | BEGIN]] -->
## Foundation-final pause addendum

Sequence 10 remains pending and contributes zero completed-window or
direct-production points. The primary authenticated Claude CLI route stopped on
an explicit temporary usage limit after a mechanically frozen ten-owned-path
checkpoint. The materially different Cowork recovery then accepted the exact
sanitized input but returned no output because the authenticated account reached
its plan limit. The initial plan reset shown as `2026-08-30 10:10
America/Los_Angeles` was superseded during the live 10:12 recheck by 10:40; the
cap remained active and no provider prompt was sent.

Only the existing Cowork task is planned to resume once at or after 10:42 Pacific. This is
the same assignment and transport after a concrete external-state change, not a
new dispatch or workload row. It earns no points until a real provider execution
becomes terminal. The `$0` packet budget prohibits buying usage credits, and all
downstream leases remain closed during the pause.
<!-- [[OpenAI Director | Codex | 2026-08-30 | 12:30 UTC | END]] -->

<!-- [[OpenAI Director | Codex | 2026-08-30 | 17:13 UTC | BEGIN]] -->
## Live usage-reset correction

The active one-shot heartbeat fired at 10:12 Pacific and rechecked the preserved
Cowork task. The authenticated UI still reported an active plan cap and now
identified 10:40 Pacific as the reset, superseding the earlier 10:10 display.
OpenAI sent no provider prompt and performed no product mutation. The same
heartbeat was moved to one 10:42 Pacific occurrence; sequence 10 remains pending
with zero completed-window and direct-production points.
<!-- [[OpenAI Director | Codex | 2026-08-30 | 17:13 UTC | END]] -->

<!-- [[OpenAI Director | Codex | 2026-08-30 | 18:15 UTC | BEGIN]] -->
## Foundation-final terminal rejection and sequential fallback

Sequence 10 is terminal. Authenticated Claude Cowork returned one valid result
archive; OpenAI mechanically composed the provider-authored checkpoint and final
overlay into exact candidate `a6742a0`, then reproduced the focused/full
TypeScript, typing, fixture, production-build and two Windows UE5.7 target-build
gates. Independent source QA rejected two P1 defects and one P2 safety defect,
so Claude receives medium/5 overall-effort points and zero direct-production
credit. Its no-revision lease and continuation heartbeat are closed.

The completed window is now 10 of 20 and 59 points: Claude 21 (35.59%), Cursor
20 (33.90%), Grok 8 (13.56%), Gemini Antigravity 10 (16.95%), OpenAI 0 and
Perplexity 0. This remains an exact PR76 warm-up advisory, not a compliance
pass.

Sequence 11 is the new owner-authorized medium/5
`LT-NATIVE-GROK-AUTHORITY-SAFETY-001` fallback. It transfers only seven exact
paths after terminal Claude, starts from `a6742a0`, and addresses materially new
OpenAI findings. Pending work earns no points. If Grok terminates, the projected
share is Claude 32.81%, Cursor 31.25%, Grok 20.31%, Gemini Antigravity 15.63%.
The queued Claude XR and RobotDealer assignments move to sequences 12 and 13 and
remain closed until the foundation is OpenAI-accepted.
<!-- [[OpenAI Director | Codex | 2026-08-30 | 18:15 UTC | END]] -->

<!-- [[OpenAI Director | Codex | 2026-08-30 | 20:20 UTC | BEGIN]] -->
## Grok terminal recovery and foundation-safety v2 route

Sequence 11, `LT-NATIVE-GROK-AUTHORITY-SAFETY-001`, is terminal
`OPENAI_CHANGES_REQUIRED_RECOVERY_AND_DELIVERY_EXHAUSTED`. Authenticated Grok
performed real work, so the assignment earns its immutable medium/5 overall
effort once. It earns zero direct-production points: no candidate or accepted
outcome exists, the patch/result provenance failed, the replacement ZIP was
corrupt and hash-mismatched, and the owner's later usage-limit retry reproduced
the same invalid bytes. The contact budget is exhausted. Exact evidence is in
`artifacts/native-program/qa/2026-08-30-grok-authority-safety-terminal-rejection.md`.

The completed window is now 11 of 20 and 64 points: Claude 21 (32.81%), Cursor
20 (31.25%), Grok 13 (20.31%), Gemini Antigravity 10 (15.63%), OpenAI 0 and
Perplexity 0. Exact PR76 enforcement remains a warm-up advisory, not a rolling
compliance pass. Cursor remains above its target-plus-five planning ceiling.

Sequence 12 is the fresh pending medium/5
`LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002` assignment. It starts from exact
`a6742a0`, uses the materially new frozen server-issued role-grant/monotonic-
counter v2 contract, and prohibits Grok implementation artifacts as inputs. It
earns zero workload and production points until terminal. XR-test and
RobotDealer move to sequences 13 and 14 and remain dependency-closed until the
new foundation is OpenAI-accepted.

If the Claude foundation-safety packet terminates, Claude projects to 26/69 =
37.68%. A later XR packet projects to 31/74 = 41.89%, and RobotDealer to 36/79 =
45.57%. The latter two exceed Claude's 41% planning ceiling and therefore need
a recorded useful-work variance or genuine rebalance; filler and duplicate
research remain prohibited.
<!-- [[OpenAI Director | Codex | 2026-08-30 | 20:20 UTC | END]] -->
