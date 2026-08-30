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
3. `LT-NATIVE-CLAUDE-001-R1` is not completed effort: its authenticated CLI
   transport hit a 429 session cap before model execution. It remains queued
   with zero points until the provider actually executes.

The exact `director-orchestrator@cc791364e2f1ff1ac4c72e01c7122296e4ff7362`
enforcer activates rolling hard thresholds only with a complete 20-assignment
window. At two completed rows it reports `rolling_window_warming_up:2/20`.
Accordingly, this baseline reports the current partial 50% Claude / 50%
Antigravity distribution as severe drift, not as a pass and not as a hard-cap
calculation over a fictitious complete window.

## Routing correction

Useful, dependency-ready work routes toward under-target providers while the
window warms:

- Grok receives the independent clean-room HouseCore packet first.
- Claude R1 resumes only after its exact provider reset; it is a required
  correction of Claude's existing authority candidate, not filler.
- Cursor's broad native XR packet remains dependency-bound and non-dispatchable
  until its accepted interfaces exist.
- Antigravity's new robot-dealer packet is prestaged but not dispatched while
  its partial share is high. It remains a real code lane, not manufactured
  credit, and must feed a later Cursor integration assignment.

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
