<!-- [[OpenAI QA | Codex | 2026-08-30 | 08:58 UTC | BEGIN]] -->
# Cursor `LT-NATIVE-CURSOR-XRCORE-001-R1` exact-candidate review

## Verdict

`OPENAI_CHANGES_REQUIRED_REVISION_EXHAUSTED_REJECTED`

Cursor performed the one authorized final revision and wrote only its isolated
plugin surface. The exact mechanically frozen candidate is not buildable and
retains substantive contract and test defects. It earns one terminal medium/5
overall-effort row and zero accepted-direct-production points. No further
Cursor revision is authorized by this packet, and OpenAI made no production
code correction.

## Immutable authority and execution

- Integration authority at dispatch: `724095818ada2baa2ec6291c9b8d8071c860c4df`.
- Work-packet file SHA-256:
  `5ee54416767b74f2f0eaa98d5b880c5edbef69e9ca393f590ab19646182a0c24`.
- Canonical work-packet digest:
  `sha256:a10418f66b3dae080b58b68f8f1f3237fde0ebf13a33b9562bd96601e04a5803`.
- Authority-snapshot digest:
  `sha256:392c84e18bd2b56d420ad5e1b9c0534e24f61d21593560f002584451a4680360`.
- Cursor chat: `2818c90a-0ac8-420e-aa02-beb79cf06bf2`.
- Cursor R1 request: `ef7e5029-d2b4-4dbe-85f1-c0ce80b8f820`.
- Model: `composer-2.5`.
- CLI wrapper usage: 129,017 input tokens, 30,238 output tokens,
  1,758,852 cache-read tokens and 0 cache-write tokens. No authenticated
  billing cost was supplied.
- The provider wrote the plugin, but its shell calls were rejected. It could
  not run Git, UBT, automation or TypeScript gates and could not create its
  local commit. Its terminal response contained two progress lines before the
  JSON result, so it did not satisfy the exact raw-result-envelope requirement.

OpenAI mechanically froze the unchanged provider-authored work only:

- Candidate: `de02a26d57065dfc52d5639ac6e2e5ae2baa0029`.
- Tree: `1faab10219e3197e2e3b8db06814ab3674298812`.
- Sole parent: `72a805fd7c8653453253527e68509c7e9a0b2895`.
- Author: `Cursor Agent <cursor-agent@users.noreply.github.com>`.
- Committer: `OpenAI QA <openai-qa@users.noreply.github.com>`.
- Scope: exactly 15 changed paths, all under
  `Unreal/Plugins/LongTableXR/**`; no generated file is committed.
- The exact candidate remained tracked-clean before and after QA. Ignored local
  build products do not belong to the candidate tree.

## OpenAI build and gate evidence

OpenAI ran the required first Unreal gate on the exact candidate:

```text
pwsh -NoProfile -File .\scripts\native\build-unreal.ps1 -Target LongTableEditor -Platform Win64 -Configuration Development -BuildSha de02a26d57065dfc52d5639ac6e2e5ae2baa0029
```

- Unreal Header Tool passed: 33 files processed.
- C++ compilation failed at
  `LongTableXRValidation.cpp:47,62`: UE5.7 has no
  `FChar::IsHighSurrogate` (`C2039` and `C3861`). The supported API is in
  `StringConv`, and safe pair handling must also validate the low surrogate.
- UnrealBuildTool exit: 6. Outer script exit: 1.
- Candidate log:
  `scripts/native/logs/ubt-LongTableEditor-Win64-Development.log`.
- Because the editor prerequisite failed, focused `LongTable.XR` automation,
  the `LongTable` game target and full `LongTable` automation were not run.

Cumulative non-Unreal evidence on the same candidate:

- Strict native TypeScript check: pass.
- Protocol fixture-current check: pass, 11 files current.
- Production web build: pass; the large-chunk message is a warning.
- Full `npm test`: fail, 155 passed and 9 failed. All nine failures are in the
  pre-existing Pages-workflow test, whose LF-only raw-text assertions compare
  against the Windows checkout's CRLF workflow file. Cursor changed neither
  the workflow nor that test. The baseline defect is not attributed to Cursor,
  but the required cumulative gate is still not green.

## Consolidated blocking findings

1. **P0 — exact UE5.7 compile failure.** The new surrogate helper calls an API
   that does not exist in UE5.7 at
   `Private/LongTableXRValidation.cpp:47,62`.
2. **P0 — validation header type declarations.** At
   `Public/LongTableXRValidation.h:28-29`, elaborated struct declarations inside
   `namespace LongTableXRValidation` create namespace-local incomplete types.
   `Private/LongTableXRValidation.cpp:24-39` dereferences them. Unity includes
   can mask this separate compile blocker.
3. **P1 — serializers remain fail-open.** At
   `Private/LongTableXRCodec.cpp:282-340`, invalid enums, numeric ranges,
   default interaction IDs and overlength presence values can still serialize.
   Comfort validation also omits dominant-hand membership; environment
   validation omits mode and anchor membership.
4. **P1 — runtime closed vocabularies remain open.** At
   `Private/LongTableXRInteractionCore.cpp:94-248`, invalid capability,
   modality, action and phase values can be stored or emitted. Persisted
   dominant-hand integers are coerced rather than rejected at
   `Private/LongTableXRSubsystem.cpp:62`.
5. **P1 — Unicode bound is not fail-closed.** The validator consumes the code
   unit after any high surrogate without proving it is a low surrogate, so
   malformed UTF-16 can evade the 32-code-point limit.
6. **P1 — exact upper bounds can overflow before validation.** Target handles
   and generation counters at
   `Private/LongTableXRInteractionCore.cpp:27,129` and
   `Private/LongTableXRPresenceCore.cpp:77,88` can compute signed
   `INT32_MAX + 1`.
7. **P1 — subsystem load phase can miss packaged startup.** The module loads at
   `PostEngineInit`, after the non-dynamic game-instance subsystem discovery
   point, so packaged standalone startup can omit the subsystem.
8. **P1 — public free functions lack `LONGTABLEXR_API`.** Validation and rights
   inventory public headers can produce cross-module unresolved externals.
9. **P1 — required automation remains non-probative.** The concealment fixture
   discards its concealed inputs; modality cancellation occurs before the
   transition being tested; presence fallback omits required absent/unavailable
   adapter cases; presence closure misses malformed UTF-16 and serializer
   rejection; comfort does not test persistence and exact bounds; anchor loss
   is invoked only after the state has already fallen back; and rights compares
   two hard-coded inventories rather than enumerating the actual plugin tree.

Positive boundary findings remain evidence, not acceptance:

- signed Blueprint-reflected fields now pass UHT;
- the codec header now forward-declares `FJsonObject` correctly;
- all 15 R1 paths stay inside the provider lease;
- all ten required test names exist;
- the declared 20-file rights inventory matches the current 20-file plugin
  tree and four declared original placeholders exist;
- no prohibited pattern-based privacy control, provider-module dependency,
  credential, network, microphone or audio-capture reference was found.

## Disposition and limits

The exact candidate is rejected and is not integrated or pushed as an accepted
artifact. OpenAI will not patch the provider-owned plugin. A new owner decision
and a genuinely new authorized assignment would be required for any further
Cursor correction; creating one merely to evade the exhausted revision budget
is prohibited.

This review proves no Android package, physical Quest hands/controllers,
passthrough, anchors, Meta presence/avatar, multiplayer, human usability,
cultural acceptance, rights acceptance, store readiness, release readiness or
combined-game completion.

<!-- [[OpenAI QA | Codex | 2026-08-30 | 08:58 UTC | END]] -->
