# Claude R1 terminal candidate — OpenAI rejection record

## Exact identity

- Assignment: `LT-NATIVE-CLAUDE-001-R1`
- Authenticated Claude session: `f0d909ff-0700-4846-b6d0-65f75598d745`
- Provider candidate: `816824ef85037caac11e90e34c090b54a1c3a7a1`
- Candidate tree: `df89b69458fb90c58e619540bd7069445a23b461`
- Sole parent: `af199d0d492a8ec8db63a013877af5c4349a30dd`
- Raw terminal result SHA-256: `sha256:4ad0c54178a6484bb525ddacf1b8df824281090409e89a5195be9a97c637b588`
- Provider worktree at handoff: clean
- OpenAI allowlist verification: 44 of 44 changed paths owned; zero outside

The authenticated provider result was schema-valid and reported `SUCCEEDED`.
Provider success is not OpenAI acceptance. The exact candidate is frozen and
terminal `OPENAI_CHANGES_REQUIRED_FINAL_RECOVERY_REJECTED` with zero accepted
direct-production points.

## Independently reproduced green gates

- Clean dependency install: 167 packages; audit reported zero vulnerabilities.
- Strict native TypeScript typecheck: pass.
- Fixture-current check: 11 files current.
- Production build: pass, with only the existing bundle-size warning.
- Full TypeScript suite from an exact LF clone: 25 files, 184 of 184 tests pass.
- UE5.7.4 `LongTableEditor Win64 Development`: pass.
- UE5.7.4 `LongTable Win64 Development`: pass.
- Headless LongTable automation: exit 0; every listed test was `Success` and
  the report aggregate contained zero failed and zero not-run tests.
- Automation report SHA-256:
  `sha256:ab127a74029bfeb0b0367e2f614bc0044f4982cee13e38202ef79f1f70918419`.

The first full TypeScript run from the normal Windows worktree produced nine
deployment-text failures because Git had smudged a shell fixture to CRLF. A
single materially different LF clone reproduced the exact candidate and passed
184 of 184. One command-location mistake accidentally ran an 85-test suite in
the mirror project; that output is excluded and not acceptance evidence.

## Blocking source findings

OpenAI split the exact candidate among three non-writing reviewers. The
following findings remain candidate-blocking even though automated gates are
green:

1. A bounded rejected-intent ledger can evict an old rejected `confirm`, after
   which the identical delayed request can consume a newer same-version local
   preview and commit it. The same cross-kind reuse risk must also be prevented
   after bounded local-ledger churn.
2. A second valid hello on one connection can overwrite its session binding
   without retiring the prior seat, leaving ghost connected presence.
3. A same-identity reconnect on a new socket removes the old session binding
   without a `closeAfter` frame, leaking the retained raw WebSocket.
4. The TypeScript welcome shape validates role, seat and projection
   independently, allowing a non-player role to carry a player hand while
   remaining schema-valid.
5. The host/public concealed-state counterfactual leaves South's hand
   unchanged, so a South-hand disclosure regression can pass vacuously.
6. Replay reconstructs the opening state before validating manifest identity
   and digest, and mismatch returns that reconstructed state.
7. Unreal context identity uses delimiter concatenation over attacker-controlled
   strings, allowing distinct token/role/table configurations to collide and
   skip reset.
8. Unreal broadcasts a welcome projection before committing session, version
   and Ready state; a synchronous callback can reconfigure the client and then
   receive stale continuation from the old welcome.
9. A same-context welcome can roll authoritative version, cached projection and
   resume marker backwards.
10. Resync can exit successfully on empty or wholly stale payloads and does not
    validate replay range, order, gaps, truncation or coverage.
11. Unreal accepts a host, public or dealer welcome that carries a player seat.
12. Unreal checks the dealer-cue outer table but not its inner frame table.

No reviewer found an executable regex, blacklist, keyword, substring or
redaction-based privacy decision. The rejection is based on structural privacy,
session, replay and state-machine defects—not on a prohibited pattern control.

## Routing disposition

The R1 assignment's provider execution is terminal and earns its immutable
long/8 points in the overall-effort ledger. It earns zero direct-production
points. The twelve findings were newly discovered after the final provider
result and therefore satisfy the Director retry exception for one materially
new, separately identified assignment. Packet
`LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001` is the only authorized correction; it
has a narrow owned-path list, no revision budget and must pass independent
OpenAI exact-candidate QA before any integration.
