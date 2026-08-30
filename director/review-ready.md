<!-- [[Codex | GPT-5.6 | 2026-08-25 | 01:46 UTC | BEGIN]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 20:48 UTC | BEGIN]] -->
# REVIEW_READY template — The Long Table

Use this only after a producer completes a reviewable artifact. It requests
independent review; it does not approve, merge, deploy, or publish anything.

## Candidate identity

- **Project/task:** `long-table-bid-whist` / `<Director task ID>`
- **Assignment:** `<producer assignment ID>`
- **Logical producer:** `<provider>`
- **Material authors:** `<all material contributors>`
- **Repository:** `<exact owner/name or not applicable>`
- **Base branch/ref:** `<exact durable ref>`
- **Base SHA:** `<exact 40-hex SHA or not applicable>`
- **Head branch:** `<candidate branch or not applicable>`
- **Head SHA:** `<exact 40-hex SHA or not applicable>`
- **Artifact digest:** `<digest for a non-repository artifact>`
- **Pull request:** `<canonical URL or none>`

## Scope and evidence

- **Changed files/artifact scope:** `<complete manifest>`
- **Outcome delivered:** `<bounded result>`
- **Acceptance checks:** `<check and result>`
- **Tests:** `<exact commands/checks and results>`
- **Rules manifest/version:** `<exact identity>`
- **Concealed-information evidence:** `<server, AI, host, spectator boundaries>`
- **Interaction/accessibility evidence:** `<hands, controllers, alternate input>`
- **Rights/provenance evidence:** `<asset ledger identity and unresolved gaps>`
- **Security/privacy context:** `<network, voice, reports, uploads, storage>`
- **Known limitations:** `<explicit list>`
- **Unresolved findings:** `<none or explicit list>`

## Reviewer request

- **Eligible reviewer:** `<different provider>`
- **Requested depth:** `<focused / full artifact / exact-SHA / security-adjacent>`
- **Required verdict:** `ACCEPT`, `CHANGES_REQUIRED`, or `SERIOUS_SAFETY_STOP`
- **Next gate after acceptance:** `<owner, CI, security, rights, merge, or release gate>`
- **Candidate invalidation:** Any artifact change voids this handoff and all
  candidate-bound review evidence.

## Authority separation

- An accepted assignment does not complete the project.
- `REVIEW_READY` does not mean accepted, merged, deployed, published, or
  released.
- A merge-eligible result records evidence only and performs no merge.
- `COMPLETE` requires all gates for the unchanged candidate, human user testing,
  and explicit owner acceptance.

```text
REVIEW_REQUEST
Project: long-table-bid-whist
Task/assignment: <task ID> / <review assignment ID>
Review exact candidate: <repository or artifact>
Base SHA: <exact 40-hex SHA or not applicable>
Head SHA/digest: <exact identity>
Producer/material authors: <names>
Scope: <complete bounded scope>
Acceptance evidence: <concise exact evidence>
Known limitations/security/rights context: <concise details>
Return: ACCEPT, CHANGES_REQUIRED, or SERIOUS_SAFETY_STOP, followed by evidence
and actionable findings.
Do not review your own material contribution. Do not merge, deploy, publish,
change access, spend funds, or infer authority from this request.
```

## Reviewer result

- **Reviewer/provider:** `<provider>`
- **Authenticated run/session:** `<run or callback identity>`
- **Reviewed exact candidate:** `<head SHA or digest>`
- **Verdict:** `<ACCEPT / CHANGES_REQUIRED / SERIOUS_SAFETY_STOP>`
- **Evidence/findings:** `<concise result>`
- **Current CI/security/rights evidence:** `<exact status or unverified>`
- **Next responsible party:** `<producer, deterministic gate, Director, or owner>`
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 20:48 UTC | END]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-25 | 01:46 UTC | END]] -->
