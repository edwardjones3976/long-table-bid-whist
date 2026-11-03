<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR | BEGIN]] -->
# Rules draft and fail-closed safety hardening

## Exact candidate

- Repository branch: `main`
- Candidate: `3dfb0554813f68c0a425432e53581be1b4d0ab35`
- Claude browser session: authenticated Claude Sonnet 5 Medium,
  chat `9c59b996-e4be-49d3-946a-b82b0bc91ba5`
- Claude artifact:
  `director/providers/2026-08-25-claude-strict-table-v1-draft.md`

## Claude rules packet

Claude produced a complete bounded draft with product invariants, provisional
house rules, sixteen human-council questions, seven current-engine
discrepancies, and fifteen conformance vectors. Its first version incorrectly
promoted the disputed 54-card/12-seat/six-kitty shape and current auction order
to product invariants. Independent review returned those findings.

The revised artifact:

- keeps the exact deck/deal and auction conventions provisional;
- retains only structural completeness and deterministic-authority guarantees
  as product invariants;
- explicitly states that the local browser is not a server/session authority
  boundary;
- labels level 7, No-Trump, seed projection, public digest, host authority, and
  substitution vectors with their true current pass/fail or unproved state;
- ends `DRAFT_REVIEW_READY` and makes no human-player approval claim.

`LT-CLAUDE-01` receives its 12 direct-work units as a review-ready provider
draft. The experienced-player rules checkpoint remains required before the
manifest can be frozen.

## Rejected Claude implementation response

Claude's follow-on Chrome code response is not accepted as implementation. It
invented repository APIs and types, including `Mode`,
`createTestGameState`, an object-returning `publicDigest`, a nonexistent
`seat` field on `HumanAction`, and test utility imports that are absent from
the repository. It receives zero implementation units.

## Adapted fail-closed correction

Director acceptance applied only the validated design intent to the real
TypeScript APIs:

1. `PlayerView` no longer contains the root deal seed.
2. AI bid/play decisions remain deterministic from the AI's own hand/legal
   view and public turn context, not from the root seed.
3. `publicDigest` no longer hashes the root seed.
4. Engine legal bids are temporarily limited to levels 3–6 and High/Low.
5. Crafted level-7 and No-Trump bids are rejected without state mutation.
6. Browser bid controls inherit the same fail-closed surface.

Internal `GameState.seed` remains available to the authoritative engine/test
harness for deterministic deal and replay. This correction removes it from
client-facing projections; it does not create a network authority boundary.

## Verification

- Focused engine tests: 8/8 passed.
- Focused application tests: 13/13 passed.
- Full tests: 21/21 passed across two files.
- Production TypeScript/Vite build: passed; 33 modules transformed.
- `git diff --check`: passed with line-ending notices only.

The first post-change build failed because `src/game/ai.ts` still referenced
`PlayerView.seed`. That failure was retained and corrected by deriving
deterministic choices from the legal AI view. The next full test/build ladder
passed.

## Remaining gates

- Human council review of every `HUMAN_COUNCIL_REQUIRED` item.
- Server/session authoritative split and adversarial hidden-information proof.
- No-Trump and level-7/Boston remain disabled until their rules are resolved.
- Joker, scoring, replay, recovery, substitution, and match-end vectors need
  full executable coverage.
- Native Quest/OpenXR and Meta Avatar work remain separate device gates.

<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR | END]] -->
