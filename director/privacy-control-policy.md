# Privacy Control Policy

<!-- [[Codex | GPT-5.6 | 2026-08-25 | OWNER-DIRECTED | BEGIN]] -->

## Owner decision

Regex-based privacy controls are prohibited for The Long Table. This prohibition
applies whether pattern matching is proposed as the sole control, a supplemental
control, a fallback, preflight filtering, post-processing redaction, log
scrubbing, provider-output clearance, or evidence that a payload is safe.

No regular expression, blacklist, keyword list, or best-effort text replacement
may decide whether concealed game state, credentials, tokens, personal data,
private prose, voice/transcript data, moderation records, or unpublished rights
records may cross a trust boundary.

## Required privacy architecture

Privacy-sensitive payloads must instead use all applicable structural controls:

1. Construct a new typed data-transfer object from an explicit allowlist of
   public fields. Never pass an authoritative or private object graph to a
   client, host, AI seat, provider, log sink, or serializer and then redact it.
2. Separate authoritative game state from per-seat, host, spectator, telemetry,
   and provider projections at the source.
3. Enforce role and capability authority before constructing a projection.
4. Reject unexpected fields with a closed schema; fail closed on unknown or
   unclassified data.
5. Keep fixed-vocabulary provider lanes and repository-owned public prompts
   physically separate from private prose and repository context.
6. Test complete serialized structures and counterfactual isolation. A UI or DOM
   absence test is useful but is not a production trust boundary.
7. Keep sensitive logs disabled or structurally field-limited. Text scrubbing
   cannot authorize logging.

## Non-privacy pattern matching

Regular expressions remain permitted for work that has no privacy or disclosure
authority, such as test-element selection, formatting, or parsing already-public
non-sensitive text. Such use must never feed a privacy, authorization,
classification, disclosure, upload, logging, or provider-routing decision.

## Acceptance rule

Any design or implementation that relies on regex, blacklist, or pattern-based
filtering for privacy is an automatic kickback. There is no owner-activation
path. Replacement requires a typed, allowlisted, structurally isolated boundary
with fail-closed tests.

<!-- [[Codex | GPT-5.6 | 2026-08-25 | OWNER-DIRECTED | END]] -->
