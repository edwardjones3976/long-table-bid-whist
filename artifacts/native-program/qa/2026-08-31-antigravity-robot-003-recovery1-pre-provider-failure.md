<!-- [[OpenAI Director | Codex | 2026-08-31 | 16:04 UTC | BEGIN]] -->
# Antigravity RobotDealer sequence 26 — Recovery 1 pre-provider failure

## Terminal classification

The sole authorized Recovery 1 ran once from exact control HEAD
`25eb99361585b46a9b95242a8b22b79fe9381342`, tree
`2b9606fce2c1c73703c131f4ba942b1df56b8260`. The launcher opened and verified
the inherited locked read-only 9,668-byte prompt handle, then failed closed at
boundary `PROMPT_HANDLE_VERIFIED` while reading the guardian readiness file:

`The process cannot access the file 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean-sequence26-recovery1-settings-rollback\guardian-ready.json' because it is being used by another process.`

No Antigravity provider process was created or resumed. The prompt disposition
is `NOT_RESUMED`; provider process identity, start ticks and resume time are
null. The raw output and stderr captures are both zero-byte files, and there is
no CLI log, authenticated transcript, conversation identifier, source edit,
completed model request or authenticated terminal result.

Recovery 1 is consumed because its distinct one-shot claim exists and the
frozen rule closes this provider route after any recovery failure. No second
recovery, ambiguous resend, normalization or further Antigravity contact is
permitted for this assignment. Sequence 26 earns zero overall points and zero
direct-production points because both its primary prompt-boundary failure and
its recovery pre-provider failure stopped before a completed model request or
terminal provider execution.

## Exact timing and safety evidence

The failure receipt was serialized completely at
`2026-08-31T16:00:22.6326247+00:00`. At that instant the guardian readiness
record was hashable, while guardian completion was not yet available. The
guardian subsequently observed the parent exit and wrote a terminal
`PARENT_EXIT_JOB_EMPTY` record at `2026-08-31T16:00:23.2834930+00:00`. That
later record proves:

- provider identity `ABSENT` and provider process ID null;
- Job active-process counts `0 -> 0` and disposition `JOB_ALREADY_EMPTY`;
- canonical settings were not written;
- completion occurred before the guardian deadline.

The frozen failure receipt is SHA-256
`33356f608f66855f8d86a004c24df0e850cfa3a5ad2ce244970dd4de04ca6c93`.
The one-shot claim is SHA-256
`56fe88df24c2841a25dfdcbafee712b3beeacd21b7d35383b0d2f3178202d5af`.
The transaction is SHA-256
`ae3f1dd3a135ed645e52cbb7990cdcaf4ea760a272edeae81cb29a08d7528321`.
Guardian readiness and completion are SHA-256
`522205c98dc2b9c7f8ea65dce12a04563b5d279e497f1434bea9c4805e072653`
and
`13790ca87cfd409c23d42fa3a90d49b792f579a0e7954cea770fdcc5cc293707`.

The prompt remained exactly 9,668 bytes at SHA-256
`39eb912cf4481d8a99d673acedff0f10d146d9300bcd0edd4014a3ebcde019d0`.
The provider sandbox remains clean at HEAD
`644d1b082347369f5c9665312946c6f5945fa925`, tree
`4085ca20ee26e081e0405d4820f3503c8f595b1c`, with no product source.
Post-stop live verification found zero `agy` processes. Canonical global and
project settings remain exactly
`5a9aef19fff41049666ff285eeecfd37ee35a9dc016b7c9be19b79dfefade2e3`
and
`5ce5b3178d47ff3516281a1298dcb7ca589d823c08f3b2545e5f187a5e706f25`.

## Preserved archive and accounting

All twelve available recovery records were copied byte-for-byte into
`artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.recovery1-pre-provider-failure/`.
Its exact inventory is frozen by `manifest.json`; the sorted twelve-row digest
is `f68ac93d04b0cc8050d085bf28b3a4aaa1e21e64112cd5c6e2036a5aa460b67e`.
The external transaction root and the external one-shot claim remain preserved
in place; neither was deleted, overwritten or reused.

Final Sequence 26 attempt accounting is one consumed primary, one consumed
Recovery 1 invocation, one provider-process launch/contact total from the
primary, zero provider-process launch/contact from Recovery 1, zero completed
model requests, zero authenticated terminal results, zero accepted source
deliveries, zero overall workload points and zero direct-production points.
The `LongTableRobotDealer/**` writer lease is closed without a candidate.
<!-- [[OpenAI Director | Codex | 2026-08-31 | 16:04 UTC | END]] -->
