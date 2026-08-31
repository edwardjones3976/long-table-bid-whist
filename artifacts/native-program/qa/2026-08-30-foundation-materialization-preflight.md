# OpenAI preflight — replacement-foundation materialization and gates

## Verified topology

- Repair seed `S`: `623ca52c5679b5348630f86eb88ecd48c9db82a1`
- Seed tree: `746fc5ac7234fa49adaa728262e95745aee52755`
- Clean product parent `A`: `a6742a04a384a88e7342530041a1f0d3ab71db2c`
- Parent tree: `0489b183e70da5751c31e9b80ed40a8b631ba55a`
- `S` has sole parent `A`.
- Repository is not shallow and has no replace refs.
- Provider commit count above `S`: zero at preflight time.
- Reserved branch `codex/claude-foundation-replacement-003-materialized`:
  absent and available.
- Reserved worktree
  `C:\Users\edwar\.codex\worktrees\long-table-claude-foundation-replacement-003-materialized`:
  absent and available.

There is no materializable provider candidate until the authorized Claude
recovery returns one complete commit and terminal packet.

## Smallest mechanical materialization

Let `P` be a future accepted provider commit. Before materialization OpenAI must
fail closed unless:

1. `P` has exactly one parent, `S`, and `S..P` contains exactly one commit.
2. The provider worktree is clean.
3. `S..P` equals the immutable 17-path lease, all ordinary `100644`
   modifications with no mode change.
4. The schema-valid provider result binds `S`, `P`, `P^{tree}`, every command,
   exit code, limitation and zero external effects.
5. No remote-containing ref contains `P`.

Then materialize the exact provider tree with a plumbing commit whose sole
parent is `A`:

```text
T = P^{tree}
C = git commit-tree T -p a6742a04a384a88e7342530041a1f0d3ab71db2c
```

This uses the complete provider tree directly. It therefore preserves every
exact repair blob and retained positive seed blob without cherry-picking,
rewriting source, or carrying the rejected seed commit in ancestry.

Required postconditions:

- `C^ == A`
- `C^{tree} == P^{tree}`
- `S` is not an ancestor of `C`
- `A..C` is exactly the packet's 36-path maximum with no mode change
- every leased path has `P`'s blob ID
- every other path has `S`'s blob ID
- candidate worktree is clean and candidate SHA/tree are frozen before QA

Sixteen repair paths overlap the seed's 35-path delta. The only additional path
is `services/table-authority/src/main.ts`, so a valid final candidate has
exactly 36 changed paths from `A`.

## Local validation readiness

- Node `v24.19.0`; npm/npx `11.17.0`
- Matching-lock dependency closure available locally; direct Vitest version
  `3.2.7`
- Unreal Engine `5.7.4`
- `Build.bat`, `UnrealEditor-Cmd.exe`, `.uproject`, build wrappers and Unreal
  automation wrapper present
- Build wrapper binds the exact 40-character `-BuildSha` and removes cached
  target `Makefile.bin`

No test or build result exists for the future candidate. Every prescribed gate
remains `NOT_RUN` until `C` exists; expensive validation must run once against
that exact clean commit.

## Quest/device boundary

- Installed Android NDK: `27.2.12479018`
- Frozen Quest requirement: NDK `25.1.8937393`
- `ANDROID_NDK_ROOT` and `ANDROID_SDK_ROOT`: unset
- Repository `Unreal/Plugins` directory: absent
- Meta XR/Oculus XR project integration hits: zero
- No current physical-headset evidence

These gaps do not block the packet's Win64 replacement-foundation gates. They
do block Android packaging, controller/hand device validation, Quest
performance, two-headset privacy, and any claim that the full Chunk A / First
Deal device milestone is accepted. Desktop or headless success cannot substitute
for those gates.
