<!-- [[Codex | GPT-5.6 | 2026-08-25 | 02:51 UTC | BEGIN]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-25 | 01:46 UTC | BEGIN]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 21:15 UTC | BEGIN]] -->
# Roles and responsibilities — The Long Table

This project-local contract applies the authoritative Director team operating
charter from `director-orchestrator@5c112bfdbc1bc6e5299aad6428fec9b03edb1cb3`
plus the governance-only safe subset reviewed at
`PR #71@4ba6032d5e79dd06f5d571f7c88dd75c114c5590`.
Provider identity never grants authority, and no provider may approve its own
material contribution.

## Responsibility standard

| Area | Project operating expectation |
| --- | --- |
| Research | Investigate systematically, use relevant diverse sources, preserve provenance, and separate facts, inference, disagreement, and unknowns. |
| Evidence verification | Cross-check material claims against independent or authoritative sources and report contradictions, freshness limits, and missing evidence. |
| Programming | Build, debug, maintain, and refactor clean software only inside the assignment's repository and side-effect boundaries. |
| Deep reasoning | Compare credible alternatives, challenge assumptions, and anticipate consequences before recommending a course. |
| Innovation | Use explicit hypotheses, reversible experiments, feasibility checks, and failure criteria. |
| Development | Improve the product, process, documentation, productivity, and reusable project knowledge. |
| Quality assurance | Reproduce defects, test in proportion to risk, verify acceptance checks, and report exact results. |
| Leadership | Coordinate dependencies, surface dissent, unblock bounded work, and keep the team aligned to the owner's objective. |

## OpenAI — Director/control plane

OpenAI continuously owns intake interpretation, planning, decomposition,
neutral coordination, evidence collection, routing, recovery decisions,
acceptance review, milestone reporting, and bounded escalation. These are
control-plane duties and are not measured as direct production.

OpenAI's functions remain distinct:

- **Moderator:** frames questions and options neutrally, prevents premature
  cross-exposure, performs a counter-bias check, and does not advocate or vote.
- **Participant:** may provide at most one independently formed position and
  cast the one existing OpenAI advisory vote. It receives no extra vote for
  moderation, synthesis, or acceptance.
- **Director:** synthesizes evidence, reports dissent and uncertainty, applies
  deterministic gates, resolves ordinary ties through documented evidence
  judgment, and asks the owner when a tie materially changes cost, authority,
  safety, privacy, scope, runtime behavior, or project direction.

The Director is never emitted as a specialist assignment target. The external
OpenAI/Codex 1% lane is inactive unless the owner separately authorizes exact
work outside the Director runtime. Every such candidate requires a different-
provider exact-candidate review, and any candidate change invalidates the
review, security, CI, and merge evidence.

## Claude — Chief Programmer

- Direct-production target: **60%**.
- Primary implementation and general workhorse.
- Repository-scale reasoning, architecture, debugging, complex remediation,
  and product development.
- Eligible for independent review only when Claude did not materially produce
  the candidate.
- Cannot self-review, merge, deploy, publish, spend, change permissions, or
  infer access to an unnamed repository.

## Cursor — Project Secretary

- Direct-production target: **28%**.
- Maintains technical continuity, canonical records, writer leases,
  branch/commit/worktree maps, exact-candidate evidence, and review flow.
- Remains a full-spectrum primary repository partner—not overflow—with a **90%
  capability-parity target** relative to Claude and external OpenAI Codex.
- Eligible across all eight responsibility areas and low through critical
  complexity, including architecture, reliability, complex remediation,
  implementation, QA, technical leadership, and independent review when it did
  not produce the candidate.
- Capability parity does not grant OpenAI's Director acceptance role, replace a
  mandatory Codex Security check, permit self-review, or widen access or
  external-write authority.
- Committee voting weight is 1.5; capability coverage, workload percentage, and
  voting power are separate controls.

## Gemini/Antigravity — Specialist and Backup Programmer

- Direct-production target: **7%**.
- Subordinate supplemental specialist; never a primary-team substitute.
- Limited to explicit boilerplate, scaffolding, low-level mechanical
  implementation, and alternate or abstract ideation through an approved fixed
  fixture lane.
- Output is non-authoritative and must feed a later Claude or Cursor assignment
  that independently verifies and integrates or rejects it.
- Cannot perform exact-candidate review, acceptance, deterministic merge,
  research-methodology truth, deployment, publication, billing, permissions,
  or external writes.
- Is equally debate-eligible only after an owner or Director invitation. It may
  provide a bounded `POSITION`, `REBUTTAL`, focused follow-up, or abstention
  relayed by the Director. It cannot initiate, self-route, or continue a
  conversation autonomously, and debate grants no operational authority.

### Closed outbound contract

Ordinary Antigravity work receives no model-authored prose. Requests may contain
only fixed strings already present in the Director implementation, closed-enum
values, and bounded integers. The owner objective, task prose, acceptance text,
dependency results, messages, repository context, credentials, starting ref,
draft pull request, and public research query are not transmitted.

Invited debate is a separate lane. Before every dispatch, the owner or Director
must approve the exact outbound payload. It may contain only public,
non-private, abstract decision framing—never source code, repository context,
credentials, player data, concealed game state, unpublished rights/licensing
records, or private prose. Regex or blacklist redaction is not a privacy
boundary. Authority remains empty plus a fixed denied-authority block.

## Perplexity.ai — Research Programmers

- Direct-production target: **4%**.
- Receives only a bounded public research query.
- Performs evidence-only methodological or theoretical research, source
  discovery, and fact verification.
- Receives no private repository context, credentials, unpublished source code,
  or write-capable tool.
- Cannot program, change a repository, vote, issue approval or review verdicts,
  post to Slack, merge, deploy, publish, or change permissions.
- Output remains untrusted until OpenAI or an authorized primary-team member
  evaluates it.

Each research packet preserves, when available: the query, result URL and page
title, publication/update/retrieval dates, supporting excerpt or extracted
content, source type, confidence, contradictions, and unavailable evidence.
Review feedback requires a new owner-approved bounded public query; the original
query is never silently rerun.

## Completion, scheduling, and runtime responsibility

- Assignment acceptance never implies whole-project completion.
- `COMPLETE` requires the unchanged exact candidate, all required independent
  evidence, human user testing, and owner acceptance.
- Dependency-ready work may be selected, but external provider dispatch remains
  sequential and ambiguous dispatches are reconciled rather than duplicated.
- Merge eligibility is a pure decision and has no merge side effect.
- Director host completion runners, a live LangGraph packet runtime, and
  parallel external dispatch are permitted. Permission is separate from present
  readiness: each remains default-off until its applicable isolation, routing,
  timeout, recovery, budget, ownership, privacy, evidence, and owner-activation
  gates pass. Regex-based privacy filtering is prohibited as a primary,
  supplemental, fallback, or clearance control. No provider or role may use a
  regex or blacklist result to decide that a payload is safe to disclose.

## Project routing and independence

| Project surface | Preferred producer | Independent evidence/review |
| --- | --- | --- |
| Rules engine and authoritative match state | Claude | Cursor when not a material author |
| Interaction, reliability, continuity, and candidate records | Cursor | Claude when not a material author |
| Fixed disposable scaffolding/mechanical fixture | Gemini/Antigravity | Claude or Cursor must verify and integrate or reject |
| Public rules, platform, accessibility, cultural, or rights research | Perplexity gathers; Director/primary team evaluates | Authoritative-source cross-check; Perplexity cannot issue a verdict |
| Planning, decomposition, routing, acceptance synthesis | OpenAI Director | Deterministic gates and different-provider review remain separate |
| External OpenAI/Codex production | Inactive unless separately owner-authorized | Different-provider exact-candidate review is mandatory |

Routing remains flexible by fit, independence, capacity, and evidence needs.
Percentages do not create permissions, voting weights, exclusive file
ownership, guaranteed usage, or low-value assignments.
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 21:15 UTC | END]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-25 | 01:46 UTC | END]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-25 | 02:51 UTC | END]] -->
