<!-- [[OpenAI QA | Codex | 2026-08-30 | 08:37 UTC | BEGIN]] -->
# Cursor `LT-NATIVE-CURSOR-XRCORE-001` exact-candidate review

## Provider and immutable packet

- Provider/model: Cursor Agent / `composer-2.5`.
- Cursor chat: `2818c90a-0ac8-420e-aa02-beb79cf06bf2`.
- Request: `61e1c1d6-36a7-465b-b6da-0ef7b0eb8c25`.
- Reported usage: 124,668 input, 32,442 output and 1,737,933 cache-read
  tokens; provider cost field reported `0`.
- Packet file SHA-256:
  `0A11A591A5861253317D6A3FE4A0B960441D0279B53D9676F7306FC5D1FDDEFE`.
- Canonical packet digest:
  `sha256:05c17de2488ddd6d69b51db78c42609d0b72c3451f05c90e6b6ba3b1eae2c3b4`.
- Authority snapshot digest:
  `sha256:6b48bd87cb9a770e3429f83765d1c0457ecd11e97b6e7600ec5aed7c28349c20`.

The CLI transport returned a successful outer wrapper, but Cursor's assignment
status was `REVISION_REQUIRED`. Its terminal text placed progress prose before
the JSON object, so it did not satisfy the exact raw-result-envelope gate.

## Candidate freeze and scope

Cursor authored 18 files under the single owned path
`Unreal/Plugins/LongTableXR/**`. Its WSL sandbox could not write the worktree's
external Git metadata, so OpenAI made a mechanical commit without modifying any
provider source content.

- Exact base: `af199d0d492a8ec8db63a013877af5c4349a30dd`.
- Candidate: `72a805fd7c8653453253527e68509c7e9a0b2895`.
- Candidate tree: `099e591fae1316d2a35a4d58e27f3d080decb9ee`.
- Parent: exact base above.
- Author: `Cursor Agent <cursor-agent@localhost>`.
- Committer: `OpenAI QA <openai-qa@localhost>`.
- Changed-path result: 18/18 under the owned plugin subtree; no provider module,
  project descriptor, target, configuration, source, content, service, package,
  fixture, workflow or governance path entered the candidate.

Cursor also created two untracked build helpers outside its owned path. OpenAI
verified that the worktree was clean before dispatch, hashed both files and
moved them recoverably—not into the candidate—to:

`C:\Users\edwar\.codex\provider-qa\quarantine\lt-cursor-xrcore-out-of-scope-20260830T082954Z`

- `_ue_steps.ps1`: 2,237 bytes; SHA-256
  `C3FB5DEADF1A9D13901DE2099DC5575AC7846AE2D019BA1C0E9A71F07928CE42`.
- `run-build-sequence.sh`: 464 bytes; SHA-256
  `F9D015B01FD842339CABE15D92022C358C85AA867FC2E440C907A59655BD8569`.

## Reproduced gate

OpenAI ran the Windows-native UE5.7.4 editor-target gate against exact candidate
`72a805f` using the repository build script and the exact installed engine.
UnrealHeaderTool failed with exit code `6`: Blueprint-reflected `uint64`,
`uint32` and `uint16` properties are unsupported at
`LongTableXRTypes.h:121,124,127,147,193,196,202,228,231`.

The game-target build and Unreal automation were not run after the editor build
prerequisite failed. No green status is inferred from provider-authored tests
that did not execute.

## Consolidated OpenAI findings

Status: `CHANGES_REQUIRED`; accepted direct-production credit: 0.

1. **P0 build failure.** Replace unsupported Blueprint-reflected unsigned
   fields with the corrected signed public contract and enforce exact ranges.
2. **P1 strict decoding.** JSON decoding uses unchecked getters and casts,
   accepts missing, wrong-typed, fractional, negative and overflowed values,
   and permits default `InteractionId=0`; serialization emits invalid enum and
   range values without validation.
3. **P1 source-loss failure.** Only `Begin` checks active modality and source
   capability. Later phases and Confirm can emit from a lost or wrong-modality
   source, and a capability downgrade does not always cancel a transient owner.
4. **P1 wrong idempotency identity.** Confirm deduplication uses
   `TargetHandle + ConfirmGeneration`; the contract requires stable
   `InteractionId + ConfirmGeneration`, which the API cannot currently express.
5. **P1 target provenance.** Caller-supplied target handles are never checked
   against the live local registry, so arbitrary and released handles emit.
6. **P1 adapter disclosure.** The optional Meta seam accepts an entire
   adapter-populated presence view and trusts its seat, nameplate and tracking
   values. It can inject invalid enums, overlength/platform/private text or
   other unclosed output. Presence must be constructed by the core only.
7. **P1 closed-structure mismatch.** The C++ modality structure adds
   `bHasTransientOwner` while the v1 authority did not. The corrected v1.1
   contract represents the UE-safe boolean and fixed owner field explicitly.
8. **P1 dependency/header mismatch.** The candidate adds the standard `Json`
   module outside the v1 dependency allowlist, and `LongTableXRCodec.h` names
   `FJsonObject` without an include or forward declaration. The v1.1 contract
   explicitly allows private JSON use; the header must remain IWYU-correct.
9. **P1 invalid automation.** Semantic parity tests only Select and masks the
   meaningful source/identity fields; the concealment test compares objects to
   themselves; Confirm enshrines the wrong key; source-loss misses the bypass;
   comfort omits persistence/bounds; anchor fallback is not exercised; and the
   rights test trusts a self-declared inventory.
10. **P1 prohibited pattern controls and deterministic test failure.** Presence
    and rights tests use substring/blacklist checks. The presence assertion is
    also inverted, so ordinary `NameplateText = "Player"` fails even after the
    compile error is fixed. Structural exact-field and exact-inventory tests
    must replace every pattern check.

## OpenAI authority correction

The original OpenAI-authored XR contract used Blueprint-incompatible unsigned
ranges and described hand/controller events as byte-identical even though the
closed `Source` field must differ. Contract v1.1 corrects these control-plane
defects: signed Blueprint/JSON-safe ranges, explicit optional-owner
representation, private `Json` allowance, stable interaction-id idempotency,
live target provenance and semantic parity with expected source identity.
This correction does not widen provider ownership, add concealed data, weaken
privacy, permit pattern controls or waive any build/test/device gate.

## Revision disposition

One consolidated Cursor R1 is authorized. It must address every finding, keep
all source changes under the same plugin subtree, create one new exact commit,
emit one schema-valid raw result object, and pass fresh editor, focused XR,
game-target and cumulative automation gates. After that revision, the packet's
revision budget is exhausted.

Android packaging, physical Quest hands/controllers, passthrough, anchors,
Meta identity/avatar, multiplayer, accessibility comfort, human, cultural,
rights, store, release and combined-product completion remain unverified.

<!-- [[OpenAI QA | Codex | 2026-08-30 | 08:37 UTC | END]] -->
