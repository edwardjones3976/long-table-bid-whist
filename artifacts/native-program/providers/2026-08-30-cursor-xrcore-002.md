# Cursor XRCore rescue assignment evidence

## Immutable assignment and transport

- Assignment: `LT-NATIVE-CURSOR-XRCORE-002`
- Provider/model: Cursor / `composer-2.5`
- Starting head/tree/parent: `de02a26d57065dfc52d5639ac6e2e5ae2baa0029` /
  `1faab10219e3197e2e3b8db06814ab3674298812` /
  `72a805fd7c8653453253527e68509c7e9a0b2895`
- Work packet file SHA-256:
  `cc133adf74b0f2a41694d7bae8b88ce7643e4d2483a9c66a5d72ccfae2995ee4`
- Canonical packet digest:
  `sha256:5d3c880b2841d7e9edc584bfa627e9f30c1500d654db4e977d83f01aba77c2de`
- Authority digest:
  `sha256:5c8b6a7f53dbc02317368ba2938ff24b3cf9f9b05ea97fefec60cc3f85de3124`
- Cursor session/request: `a0bf5116c-ce93-4fa7-880a-a35b652f3476` /
  `7f0233d0-b391-4ca5-a09a-6b73faad5eefd`
- Usage: 97,388 input; 28,802 output; 1,808,381 cache-read

Cursor authored 11 plugin-only files, but every Shell invocation was rejected.
The provider honestly terminated `FAILED`; Git identity, UE builds, automation,
TypeScript and the provider commit were NOT_RUN.

OpenAI recorded the mechanical freeze authority in
`LT-NATIVE-CURSOR-XRCORE-002-SHELL-DELTA.json`, then staged and committed the
exact unchanged provider bytes with Cursor as author and OpenAI QA as committer.
The pre/post binary-diff digest matched
`0915cbe0bf8443dbeb80d12bb805a22a2bfabd97`.

- Candidate: `72fb778a9536b4e5dda74d73451244d069d53713`
- Tree: `156070468946e0f3092830857dc6077a1564ce8c`
- Sole parent: `de02a26d57065dfc52d5639ac6e2e5ae2baa0029`
- Allowlist: 11 changed files, all under `Unreal/Plugins/LongTableXR/**`
- Tracked status after freeze: clean

## Independent OpenAI QA

The first required UE5.7 editor build ran on the exact candidate and failed:

- repository script exit `1`; UnrealBuildTool exit `6`;
- `LongTableXRTests.cpp:427` treats
  `UGameInstance::InitializeStandalone()` as Boolean, but UE5.7 declares it
  `void`;
- log: `scripts/native/logs/ubt-LongTableEditor-Win64-Development.log`.

Static review retained these additional blockers:

1. The game-instance test object has the transient package rather than a valid
   engine outer and would assert after the compile fix.
2. JSON decoders mutate caller output before later validation fails; decode is
   not transactional.
3. Target-handle, interaction-ID, transition, placement and recenter maximum
   paths still perform overflow-prone arithmetic or mutate/emit before failure.
4. Source-loss, modality, placement and recenter rejection paths are not fully
   atomic; one path can publish interaction ID zero.
5. Required boundary/type/missing-field, exactly-one cancel and genuine
   cross-instance persistence tests are incomplete.
6. The rights test uses `StartsWith` pattern classification, which the packet
   explicitly prohibits.

The editor build failure stopped focused XR automation, game build, full Unreal
automation and TypeScript gates in the required order; none is inferred.

## Final recovery

`LT-NATIVE-CURSOR-XRCORE-002-R1.json` is a strict Director
model-work-packet-v1 document with raw SHA-256
`abb7c31e5d70eb8ea2395f817eea03c3d638fef335a1ecd486a8ab22cc9c5cf9`
and canonical digest
`sha256:08e25f8e11c300a608c0ca23fdbed5c6ca4ce1e575b429837d49ba92a0705db8`.
It consolidates every finding, prohibits Cursor Shell and external tools, keeps
Cursor the sole plugin writer, and authorizes exactly one final source-only
recovery in the same authenticated session. OpenAI will mechanically freeze
and independently test its terminal bytes; no further Cursor revision is
authorized.
