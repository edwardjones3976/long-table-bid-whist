# Owner-authorized native provider overlay

## Authority

- Director policy reference: `cc791364e2f1ff1ac4c72e01c7122296e4ff7362`.
- Owner direction: Claude, Cursor, Grok, and Antigravity each code a designated,
  non-overlapping section; OpenAI performs QA and kicks corrections back to the
  owning provider.
- Except for the explicit exhausted-route fallback transfer recorded below,
  this overlay does not change provider ownership, concealment boundaries,
  release gates, budgets, or the rolling program workload ledger.

## Why an overlay is required

The referenced Director policy currently upgrades non-Antigravity implementation
to at least medium effort and allows medium/long implementation only through
Claude at the FABLE model floor. Its live router also copies one plan-level path
scope into every assignment. Those rules cannot represent the owner's explicit
Cursor and Grok coding lanes with distinct writable paths.

Cursor and Grok therefore receive manually governed Director-v1 work packets.
Each packet must validate against the immutable PR policy schema, bind an exact
accepted dependency, carry one isolated writable allowlist, and return an exact
candidate for OpenAI QA. They are not described as live-router-compliant or as a
live workload-enforcement pass. The owner direction is the explicit manual
override; implementation work is not relabeled as review or coordination.

Program allocation units in `provider-workload.yaml` are a scope-capacity
forecast only. They are not rolling assignments and never become production
credit. The canonical ledger records one ordered entry per actual packet using
Director v1 size points `1`, `2`, `5`, or `8`; only an authenticated,
OpenAI-accepted outcome earns those points. A broad response cannot be split
retroactively, and filler work is prohibited.

## Provider boundaries

- Claude writes the rules, protocol, table authority, Unreal scaffold,
  `LongTableProtocol`, `LongTableTable`, and composition root.
- Cursor writes only `LongTableXR` and Input, Presence, and Environment content.
- Grok writes the session gateway, `LongTableSocial`, Social content, and—only
  under the clean-room fallback packet—the in-repository `LongTableHouseCore`.
- Antigravity's historical writer authority ended when its single revision was
  rejected; its isolated candidate remains quarantined with zero credit.
- OpenAI writes control-plane and QA evidence only. It does not correct provider
  production code.

Accepted Claude protocol headers, schemas, fixtures, and registration interfaces
are readable, immutable dependencies for Cursor and Grok. They must not appear in
`prohibited_paths`, because Director defines a prohibited path as never read,
written, or referenced. `owned_paths` remains the only writable surface.

Cursor and Grok depend on Claude's OpenAI-accepted outcome only. They do not
depend on one another. Quarantined Antigravity output is never a Grok input or
authority dependency.

## HouseCore exhausted-route fallback transfer

OpenAI independently built the Antigravity recovery but its headless automation
finished 8/11 and source review retained substantive state-machine defects. The
closed assignment allowed one revision; that budget is exhausted. Its artifact,
sandbox, frozen QA copies, hashes, and zero-credit history remain immutable.

Prospectively, `Unreal/Plugins/LongTableHouseCore/**` transfers to Grok under one
new schema-valid clean-room packet. Grok must implement from the public contract
and accepted Claude interfaces only. It is prohibited from reading, copying,
patching, importing, or claiming provenance from the Antigravity sandbox or QA
copies. The transfer creates one active repository writer and does not rewrite
Antigravity's historical assignment, result, or workload credit.

## Digest reconciliation

The dispatched Claude packet stores
`sha256:ba8c1efb692573371ec2d28890f67dad3650662d53c655115ea5eda64926e7fd`,
the RFC 8785 SHA-256 of the bare authority-snapshot array. Its immutable packet
file SHA-256 is
`e0ab5ba72479d912e8b4eb5f01b03c321b2c952682346ed051d4ab84d740caef`.

PR policy routing computes the snapshot-document digest over
`{"authority_snapshot": [...]}`. For the same dispatched snapshot that digest is
`sha256:72ac26df7d9bbd31da858267c29a8c020bf610dcca51069c028dd09b56b4344e`.

Claude evidence remains bound to the exact packet it received; no ambiguous
redispatch is allowed. The bare-array digest is not propagated. Fresh Cursor and
Grok packets use the snapshot-document form and depend on the separate digest of
the exact OpenAI-accepted Claude `AssignmentOutcome`.

## UE target-rule path amendment

OpenAI's exact-candidate QA confirmed that UnrealBuildTool 5.7 discovers a
project's target-rule classes only when they are direct children of the
project's `Source` directory. The dispatched Claude packet mistakenly
allowlisted `Unreal/LongTable.Target.cs` and
`Unreal/LongTableEditor.Target.cs`; those locations do not produce a valid
code-project target.

For assignment `LT-NATIVE-CLAUDE-001` only, the owner-authorized manual overlay
therefore treats these two engine-required paths as Claude-owned:

- `Unreal/Source/LongTable.Target.cs`
- `Unreal/Source/LongTableEditor.Target.cs`

This is a two-file path correction, not a scope expansion. No other direct
child of `Unreal/Source`, no XR or Social module, and no provider-owned content
path is added. The original packet remains immutable and the provider's
disclosure remains part of its evidence. OpenAI still verifies both target
files, the complete changed-file set, UBT recognition, and the exact candidate
before any acceptance credit.

## Acceptance

Manual routing never weakens acceptance. Each provider candidate still requires:

1. exact base, head, tree, and origin evidence;
2. a clean changed-path allowlist;
3. deterministic tests and Unreal build evidence appropriate to its lane;
4. structural closed-schema privacy review without regex-based privacy control;
5. an OpenAI accepted-outcome digest before integration credit.

Any code correction returns to its owning provider and creates a new exact
candidate. Merge, release, Meta account/license effects, physical Quest claims,
human acceptance, cultural acceptance, and rights acceptance remain separate
gates.
