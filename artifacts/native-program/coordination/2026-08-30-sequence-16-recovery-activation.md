# Sequence 16 transient-recovery activation

- Assignment: `LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003`
- Provider/model: Claude Code `2.1.251`, `claude-fable-5`, effort `max`
- Director control base: `b9e1f128f2660441cd63bec083ad065d1a159b7a`
- Immutable packet SHA-256: `85ba252916b6496045e64285a9da1d9cca4de34821bbc333f113f572694f9a80`
- Assignment approval digest: `sha256:57df50c0157b7304817cd8f99eb738c2f968f8bc06dac193719f80b217209acb`
- Primary run: `claude-code:eb37d2e5-253f-456b-b2cb-63d40a367fbc`
- Primary terminal condition: provider HTTP `429` session limit, reset stated as `2026-08-30T19:00:00-07:00`
- Recovery not before: `2026-08-30T19:00:00-07:00`
- Scheduled wake: `resume-long-table-claude-recovery`, once at `2026-08-30T19:05:00-07:00`

## Exact recovery state

- Worktree: `C:\Users\edwar\.codex\worktrees\long-table-claude-replacement-003`
- Branch: `codex/claude-foundation-replacement-003`
- HEAD: `623ca52c5679b5348630f86eb88ecd48c9db82a1`
- HEAD tree: `746fc5ac7234fa49adaa728262e95745aee52755`
- Sole parent: `a6742a04a384a88e7342530041a1f0d3ab71db2c`
- Expected dirty path: `services/table-authority/src/table.ts` only
- Expected partial binary-diff SHA-256: `3de9147d2e0d115b2d028ec6825391970b961c8960849e74da3cd6616f455feb`
- Expected partial size: `76` added / `15` removed lines
- Expected partial `git diff --check`: clean
- Candidate commit count above the seed: `0`

The dirty change is exact Claude-authored primary output. It may be continued by
the same assignment recovery but is not an accepted outcome, candidate,
materialization input, workload credit, or product ancestry.

## Recovery delta

This is the packet-authorized single transient recovery, not a new assignment,
revision, retry row, or new workload credit. The immutable objective, 17-path
lease, tests, stopping conditions, privacy boundary, sole-parent materialization
rule, budget classification, and model remain unchanged.

The recovery transport must:

1. Reverify every exact identity and the partial patch hash above after the
   quota reset. Stop without provider contact on any mismatch.
2. Start a fresh local print-mode session. Do not resume the primary session.
3. Use Safe Mode, disable auto/org memory, Chrome, session persistence, skills,
   connectors and all MCP servers, and expose no network/provider tools.
4. Send the immutable packet plus this exact recovery state by value. Do not
   read `director/**`, `artifacts/**`, `sources/**`, prior transcripts, Claude
   Memory, Project knowledge, or another repository.
5. Tell Claude that tool availability is already verified. It must not spend
   turns on environment/version/identity reconnaissance and must use built-in
   read/search tools for source inspection.
6. Permit only the packet's local read/edit, exact Git evidence/commit, focused
   test, build and Unreal automation operations. No push, merge, reset, clean,
   stash, branch, remote mutation, package install, curl, browser, device or
   external effect is permitted.
7. Adapt the result schema in memory only by removing its unsupported `$schema`
   and `$id` declarations; every result field and validation rule remains
   unchanged.
8. Stop after exactly one local provider commit and one schema-valid terminal
   result. A second recovery or revision is prohibited.

## Post-recovery fail-closed gate

OpenAI accepts the provider handoff for materialization only if all of the
following are true:

- one and only one new local commit above `623ca52c`;
- clean worktree;
- repair diff equals the exact 17 leased paths, with no path-mode change;
- candidate commit is absent from every remote-containing ref;
- schema-valid terminal result binds exact base, candidate and tree;
- no external effect or privacy/right boundary violation;
- every claimed command and result is independently rechecked.

Any mismatch, another session limit, missing commit, incomplete path set,
schema failure, uncommitted residue, or prohibited effect is terminal for this
route. OpenAI may preserve evidence but may not author a product correction.
