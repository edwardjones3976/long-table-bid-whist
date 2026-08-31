<!-- [[OpenAI Director | Codex | 2026-08-31 | 06:07 UTC | BEGIN]] -->
# Claude RobotDealer frozen working tree — preterminal static QA

## Verdict

The frozen uncommitted sequence-25 working tree is **not acceptable yet**.
Static UE5.7 inspection found no definite compile/UHT/UBT defect, and the
closed-schema, privacy, dependency, rights and no-media boundaries are strong.
Two source-level acceptance concerns remain, while provider commit, structured
result, builds and automation are still absent by construction after the
temporary session-limit stop.

This is preterminal OpenAI QA of the exact working-manifest SHA-256
`3fba90f9e9c782da2363272f8515d80eff0530a57e6e3588df5d84f14e8a1989`.
It neither edits provider bytes nor supplies a correction to the authorized
transient recovery. If recovery changes any byte before its sole provider
commit, OpenAI must repeat the relevant source checks against the exact commit.

## Admissible findings

### P2 — repeated pause can emit a cue/state sequence mismatch

The public header describes `PresentationState.PublicSequence` as the sequence
of the most recently presented cue and says it never decreases. The state
machine accepts this legal trace:

1. `PresentationPaused(1)` emits and sets presentation sequence 1.
2. Ordinary cue 2 queues.
3. `PresentationPaused(3)` emits and raises presentation sequence to 3.
4. Ordinary cue 4 queues.
5. `PresentationResumed(5)` drains cue 2 before cue 4.

During that drain, `CopyPresentedFields` refuses to lower the presentation
sequence from 3 to 2, but copies cue 2's focus, counts, team and motion, then
broadcasts cue 2 with that hybrid state. The implementation therefore emits
cue 2 paired with `State.PublicSequence == 3`, contradicting its own header
semantics and the `DirectQueuedInterleaveCannotRegress` invariant that state and
cue sequence are equal.

The required double-pause test exercises this ordering but checks only cue
order. The queue-capacity test similarly accepts a second pause at sequence 66
before draining 64 older cues and then checks only the drained cue bytes.

Relevant exact provider lines:

- `LongTableRobotDealerCueInterface.h:107`
- `LongTableRobotDealerStateMachine.cpp:131-150`
- `LongTableRobotDealerStateMachine.cpp:172-186`
- `LongTableRobotDealerTests.cpp:869-884`
- `LongTableRobotDealerTests.cpp:1111-1120`
- `LongTableRobotDealerTests.cpp:1163-1175`

The frozen JSON contract explicitly requires a monotonic acceptance high-water
mark but does not separately define whether output-state `PublicSequence` is
cue-correlated or a presentation high-water field. This ambiguity does not
clear the candidate: the candidate's public header, implementation and tests
must select one consistent observable meaning and prove it.

### P2 — dealer-mode authority-equivalence evidence is structurally limited

`DealerModeAuthorityEquivalence` creates one test-local synthetic ledger, copies
it for AI Dealer and Human Host, never makes either copy reachable from the
plugin, and then confirms the untouched copies remain identical. This is useful
structural noninterference evidence, but it does not execute two authoritative
game paths or directly prove identical cards, legality, trick winners, score and
authority digest as worded by the public contract.

The README is honest: it says the standalone plugin cannot prove those Bid
Whist authority properties and defers them to later integration. That is
consistent with the contract's final acceptance boundary, which also leaves
authority integration separate, but it exposes an authority inconsistency
inside the contract: the standalone plugin's required test ID is being asked to
prove a property that requires the later composition. OpenAI therefore records
the plugin test as structural evidence only and leaves the complete dealer/
human-host equivalence gate open for composition QA.

Relevant exact provider lines:

- `LongTableRobotDealerTests.cpp:1369-1420`
- `README.md:173-180`
- `PUBLIC_CONTRACT.json:114`
- `PUBLIC_CONTRACT.json:163`

### P3 — test helper expands the shipping runtime reflection surface

`LongTableRobotDealerTestListener` is an unguarded `UCLASS`/`UFUNCTION` inside
the Runtime module, while only the automation body is guarded by
`WITH_DEV_AUTOMATION_TESTS`. The module-boundary test explicitly expects the
helper in the reflected package. No explicit contract inventory prohibits that
class, so this is a boundary risk rather than a proven violation; executable
QA must confirm the shipping target and reflection inventory are intentional.

### P3 — some positive boundary tests are weaker than the current source

The current source has no prohibited command or module dependency, but the
function-inventory helper accepts broad integer, Boolean, struct and approved
enum parameter kinds without freezing the exact reflected function inventory.
The module-boundary test checks reflected type ownership rather than parsing the
descriptor and Build.cs dependency closure. OpenAI must preserve independent
static descriptor/dependency checks instead of treating those tests alone as
complete boundary proof.

## Static passes

- Exact frozen authority HEAD/tree and two authority-file hashes match.
- Exactly thirteen provider-created files exist, all under the leased subtree.
- No generated, packaged, log, cache, report or media artifact exists.
- `.uplugin` is valid JSON with Runtime, Default and `CanContainContent=false`.
- Build dependencies are exactly `Core`, `CoreUObject` and `Engine`.
- Twelve cue kinds, eleven motion kinds and seven result kinds match the frozen
  contract.
- Cue and presentation state expose exactly the six and seven ordered fields.
- Native and Blueprint delegate seams are separate; lambda binding is native
  and dynamic binding uses a UObject/UFUNCTION listener.
- All fifteen required automation test IDs are registered exactly once.
- All thirteen files are LF-only, without BOM or NUL bytes.
- No regex, blacklist, keyword/substring, redaction, serialize-then-delete or
  concealed-object-then-delete privacy control exists.
- No identity, credential, network, telemetry, concealed-state, authority,
  audio, music, media, URL, Meta SDK or third-party content surface was found.
- Static comparison to UE5.7 public headers found no definite API/signature
  mismatch. Actual UHT, compile and link success remain `NOT_RUN`.

## Inadmissible audit claim

One parallel auditor claimed the provider markers were malformed by reading an
unrelated legacy project profile outside this assignment's sealed authority.
OpenAI rejects that claim. The sequence-25 prompt intentionally requires the
fresh outer pair
`[[Claude | Fable 5 | 2026-08-31 | LT-NATIVE-CLAUDE-ROBOT-001 | BEGIN|END]]`,
matching the current Director assignment-marker pattern. The pairs are balanced
on every taggable provider file, and the syntax-sensitive `.uplugin` correctly
contains no comment. Final provenance acceptance still awaits a provider commit
and exact Director validation against the materialized candidate.

## Next evidence gate

After Claude's one authorized post-reset recovery, OpenAI must first bind the
exact provider commit, raw schema-valid result, parent/tree/modes/encodings,
authority hashes and changed-file allowlist. Only then may it mechanically map
unchanged provider bytes onto accepted foundation `4d26680`, run the Director
contribution validator, TypeScript baseline, both UE5.7 targets, all fifteen
focused tests, full LongTable automation and the independent structural/
composition checks. A green standalone plugin still does not prove embodied
robot presentation, XR integration, Android/Quest, two-device privacy, human,
cultural, store, merge or release gates.

<!-- [[OpenAI Director | Codex | 2026-08-31 | 06:07 UTC | END]] -->
