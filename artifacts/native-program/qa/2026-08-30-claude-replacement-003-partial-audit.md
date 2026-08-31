# OpenAI audit — Claude replacement 003 primary partial

## Exact subject

- Worktree: `C:\Users\edwar\.codex\worktrees\long-table-claude-replacement-003`
- HEAD: `623ca52c5679b5348630f86eb88ecd48c9db82a1`
- Tree: `746fc5ac7234fa49adaa728262e95745aee52755`
- Sole parent: `a6742a04a384a88e7342530041a1f0d3ab71db2c`
- Sole dirty path: `services/table-authority/src/table.ts`
- Partial diff: `76` additions / `15` deletions
- Partial binary-diff SHA-256: `3de9147d2e0d115b2d028ec6825391970b961c8960849e74da3cd6616f455feb`
- `git diff --check`: clean

This read-only audit made no product edit, provider contact, commit, external
effect, or expensive validation run.

## What the partial contains

The primary added contract comments; grant/incarnation constants; the
`IncarnationState`, `IncarnationBundle` and `CommitEngine` declarations; a
required `TableOptions.incarnation`; optional `commitEngine`; and five balanced
`FOUNDATION-REPLACEMENT-003` marker pairs. It changed no authority runtime
implementation and none of the other 16 leased paths.

## Fail-closed findings

1. **P0 — inconsistent API (`table.ts:155`, constructor `308-313`).** The
   options type removes `restoredLanes` / `restoredGrantHighWater` and requires
   `incarnation`, but the constructor still reads the removed fields. Existing
   production, test and fixture callers omit the new bundle. Typed gates cannot
   compile.
2. **P0 — incarnation isolation inactive (`table.ts:345`).** `issueGrant()`
   still emits `grant-<n>` and no runtime field stores or validates the
   incarnation. Different authorities can still reuse identities.
3. **P0 — unsafe restore remains (`table.ts:308-321`).** Restore still shallow
   copies arbitrary lanes/high-water and loses sticky exhaustion. It does not
   validate the exact five lanes, namespace, canonical and unique counters,
   ranges, maximum-equals-high-water, or counter wrap.
4. **P1 — duplicate mutation remains (`table.ts:628-630`).** The duplicate path
   still writes `lastReceipt`, so player-visible authority state is not byte
   identical.
5. **P1 — engine seam inactive (`table.ts:721`).** Runtime still calls
   `applySeatAction` directly; `commitEngine` is declaration-only.
6. **P1 — complete state export absent (`table.ts:355-378`).** There is no deep
   round-trippable export containing incarnation ID, all five lanes, grant
   high-water and sticky exhaustion.
7. **P2 — required marker restoration absent.** The
   `FOUNDATION-FINAL-001` pair is still missing from `table.ts`.

The partial is safe to continue only as exact quarantined Claude-authored input.
It is not safe to compile, commit, accept, materialize or consume as authority
behavior.

## Recovery continuation delta

After the quota reset, the single recovery must:

1. Complete validated incarnation storage, explicit external allocation,
   nonwrapping `g:<incarnation>:<counter>` grants, atomic restore, sticky
   exhaustion, deep export, duplicate no-mutation and the real engine seam.
2. Update `main.ts`, every constructor/caller, required TypeScript and real
   WebSocket tests, contribution markers and only the four permitted generated
   fixtures.
3. Complete the untouched five-file Unreal transport-epoch, legal delegate
   snapshot, receipt-confirmed counter and identity-rejection surface plus its
   named automation tests.
4. Produce exactly one local commit across the exact 17 leased paths and one
   schema-valid terminal packet, with every gate run or honestly `NOT_RUN`.

## Local test preflight

- Node: `v24.19.0`
- npm: `11.17.0`
- Unreal Editor and Build tool: present under UE `5.7`
- Required build and automation wrappers: present
- Target worktree package-lock SHA-256:
  `738aa5fe475cd926ad9b15d54fd5d5527b6797080453e5f3e2ef3659080b3fd9`
- A sibling worktree has the identical lockfile and `vitest 3.2.7`; its existing
  dependency tree is exposed through an ignored local junction. No dependency
  download or tracked mutation occurred.
- No `metavr` executable is currently available, so physical-device evidence
  remains unavailable and cannot be inferred from desktop/Unreal gates.
