<!-- [[OpenAI Director | Codex | 2026-08-30 | 07:25 UTC | BEGIN]] -->
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

The exact `director-orchestrator@cc791364e2f1ff1ac4c72e01c7122296e4ff7362`
enforcer activates rolling hard thresholds only with a complete 20-assignment
window. At four completed rows it reports `rolling_window_warming_up:4/20`.
Accordingly, this baseline reports the current effort-weighted partial 34.78%
Claude / 21.74% Cursor / 43.48% Antigravity distribution as severe drift, not
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
field. Firecrawl is a tool, never a workforce provider. Cursor and Antigravity
retries stay inside their original assignment rather than being counted again.

This baseline is not permission to merge, release, spend, accept licenses,
access accounts, claim device/human/store completion, or relax one-writer,
privacy, security, exact-candidate or OpenAI QA gates.

<!-- [[OpenAI Director | Codex | 2026-08-30 | 07:25 UTC | END]] -->
