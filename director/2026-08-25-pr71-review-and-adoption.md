<!-- [[Codex | GPT-5.6 | 2026-08-25 | 02:51 UTC | BEGIN]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-25 | 01:46 UTC | BEGIN]] -->
# Director Orchestrator PR #71 review and Long Table adoption

## Review binding

- **Pull request:** [#71 — Activate guarded completion and LangGraph packet runtimes](https://github.com/edwardjones3976/director-orchestrator/pull/71)
- **Repository:** `edwardjones3976/director-orchestrator`
- **Base:** `main@5c112bfdbc1bc6e5299aad6428fec9b03edb1cb3`
- **Reviewed head:** `4ba6032d5e79dd06f5d571f7c88dd75c114c5590`
- **State at review:** open, non-draft, mergeable; required review decision absent
- **Final revalidation:** `2026-08-25T01:55:53Z`; head unchanged
- **Checks at revalidation:** repository CI was green; Cursor security and approval checks completed, Cursor Bugbot was neutral with an unresolved finding, and its optional autofix was still in progress
- **Review type:** read-only, findings-first, exact-head review; no GitHub review or comment was published

## Findings

### Blocking

1. **High — Completion runners are not isolated from the host.**
   `src/director_orchestrator/completion_gates.py:815` launches repository-selected code on the orchestrator host. Environment reduction and post-execution repository checks do not prevent credential reads, network exfiltration, metadata-service access, or unrelated filesystem writes.
2. **High — Antigravity debate can disclose private prose.**
   `src/director_orchestrator/antigravity.py:556` relies on an incomplete blacklist before sending a free-form question, options, revisions, and prior contributions. Exact-payload approval and public-only classification are not enforced by the runtime.
3. **Medium — Timeout and output-limit handling kill only the parent process.**
   `src/director_orchestrator/completion_gates.py:991` creates no isolated process group or Windows job object; a detached child can survive and keep writing after the gate reports failure.
4. **Medium — The runner fingerprint is vulnerable to replacement.**
   `src/director_orchestrator/completion_gates.py:120` fingerprints the executable when the definition is created, but does not reauthenticate the exact bytes immediately before execution.
5. **High — Acceptance evidence is stale for the current head.**
   The PR body binds its Cursor `ACCEPT`, 887-test report, contribution range, and security-clearance request to `982e1f2e...`; the reviewed head is `4ba6032d...`. Four later commits changed the Antigravity contract and tests. The canonical PR has no submitted review decision, and the current security comment remains `SECURITY_CHANGES_REQUIRED`.
6. **High — Live activation surrenders legacy ownership before packet routing exists.**
   `src/director_orchestrator/engine.py:3668` moves pending legacy assignments to owner decision when live flags are enabled, but production intake is not routed into `LangGraphPacketRuntime.run_packet`. The advertised live lane can therefore leave tasks with no executing engine.
7. **High — The packet timeout is advisory, not enforced.**
   `src/director_orchestrator/langgraph_runtime.py:652` passes a timeout value into adapter context but places no cancellation boundary around synchronous provider dispatch. A hung transport can block indefinitely and strand the ledger in `DISPATCHING`.
8. **Medium — Repeated revisions branch from stale provider state.**
   `src/director_orchestrator/engine.py:4015` continues to pass the original run after a revision, so a second revision can omit the first revision's work.
9. **Medium — Unknown deferred scheduler inputs are silently discarded.**
   `src/director_orchestrator/scheduling.py:110` intersects deferred sequences with the plan instead of failing closed as it does for unknown completed sequences.
10. **Medium — Spend-ledger identity conflicts are treated as retryable limits.**
    `src/director_orchestrator/providers.py:123` classifies a mismatched existing reservation as a daily-limit exception. The engine can handle this integrity conflict as a retryable pre-submit failure instead of a hard stop.
11. **Medium — Later PASS attempts hide still-valid earlier dependency digests.**
    `src/director_orchestrator/completion_store.py:216` indexes trusted PASS evidence only by gate ID. A later attempt replaces the earlier digest and can make valid dependents appear untrusted during replay or completion aggregation.

### Non-blocking strengths

- Assignment acceptance and whole-project completion are separate authorities.
- Activation is default-off and health/readiness claims are explicit.
- Merge eligibility is a pure decision with no merge side effect.
- Dependency-ready scheduling is honest but sequential; parallel external dispatch is not claimed.
- Revision loops are bounded, provider costs are reserved prospectively, and a Perplexity revision requires a new owner-approved public query.
- Antigravity cannot initiate debate or acquire operational authority.

## Verdict

`REQUEST CHANGES`

The PR should not be merged or activated at the reviewed head. Green repository CI does not clear the host-execution/data-disclosure findings, incomplete live routing and timeout enforcement, completion-evidence integrity defects, revision/scheduler/accounting defects, or stale exact-head acceptance evidence.

## Long Table adoption decision

| PR #71 concept | Project decision | Long Table adaptation |
| --- | --- | --- |
| Assignment vs. project completion | Adopt | A finished provider chunk may be accepted without making the game `COMPLETE`; human user testing and owner acceptance remain mandatory. |
| Default-off activation and honest readiness | Adopt | All live provider dispatch, networked game service, shared audio, deployment, and merge effects remain disabled until their own gates pass. |
| Dependency-ready scheduling | Adopt | Work may be selected when dependencies are ready, but external provider execution remains sequential and bounded. |
| Bounded revision loops | Adopt | Maximum three planned revisions; every revision records changed evidence and invalidated candidate review. |
| Prospective review-cost reservation | Adopt as planning rule | Any paid review must be approved and budgeted before dispatch; the current budget remains zero incremental dollars. |
| Perplexity revision query | Adopt | Feedback never silently reruns the original query; a new bounded public query requires owner approval and fresh provenance. |
| Invited Antigravity debate | Adopt with stronger gate | Antigravity is equally debate-eligible after a Director/owner invitation, but cannot initiate. The exact outbound prompt must be approved and contain only public, non-private, abstract decision context. It has no execution, review, acceptance, merge, deployment, or publication authority. |
| Pure merge eligibility | Adopt | A green decision records eligibility only; it never performs a merge. |
| Host completion runners | Permitted, activation-gated | May run allowlisted project checks after host isolation, process-tree termination, executable reauthentication, evidence binding, and owner activation gates pass. |
| Live LangGraph packet runtime | Permitted, activation-gated | May become the live writer after production intake routing, enforceable dispatch timeouts, recovery, single-writer, and readiness gates pass. |
| Regex-only privacy controls | Permitted as a supplemental control | Regex filtering may be used, but by itself does not prove that a private outbound payload is cleared; data classification and exact-payload authority remain separate evidence. |
| Parallel external dispatch | Permitted, activation-gated | May run after dependency, budget, provider-capacity, idempotency, writer-ownership, and ambiguous-dispatch reconciliation controls pass. |

This integration permits future guarded adoption of every listed runtime capability. It does not claim that unresolved PR #71 code is currently ready, import that code, activate a provider, publish a review, merge a branch, or change the game build.
<!-- [[Codex | GPT-5.6 | 2026-08-25 | 01:46 UTC | END]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-25 | 02:51 UTC | END]] -->
