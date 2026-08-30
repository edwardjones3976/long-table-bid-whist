# Sequence 16 activation evidence

- Assignment: `LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003`
- Director policy: `cc791364e2f1ff1ac4c72e01c7122296e4ff7362`
- Packet SHA-256: `85ba252916b6496045e64285a9da1d9cca4de34821bbc333f113f572694f9a80`
- Assignment approval digest: `sha256:57df50c0157b7304817cd8f99eb738c2f968f8bc06dac193719f80b217209acb`
- Seed HEAD: `623ca52c5679b5348630f86eb88ecd48c9db82a1`
- Seed tree: `746fc5ac7234fa49adaa728262e95745aee52755`
- Worktree/branch: `C:\Users\edwar\.codex\worktrees\long-table-claude-replacement-003` / `codex/claude-foundation-replacement-003`
- Worktree clean: yes
- Owned paths present: 17 of 17
- Provider dependencies: sequences 14 and 15 terminal and committed

## Exact merged-Director decision

- Result: `allow`
- Violations: none
- Advisories:
  - `primary_ceiling_active_with_other_providers:3`
  - `rolling_window_warming_up:15/20`
  - `direct_production_window_warming_up:1/20`

The PR76 evaluator correctly reports a 15/20 warm-up rather than fabricating a
complete rolling-window pass. The stricter project planning gate was evaluated
separately against the exact post-assignment effort points:

| Provider | Projected points | Projected share | Project hard ceiling | Result |
| --- | ---: | ---: | ---: | --- |
| Claude | 31 | 38.75% | 41% | pass |
| Cursor | 20 | 25.00% | 25% | pass at boundary |
| Grok | 18 | 22.50% | 25% | pass |
| Gemini/Antigravity | 11 | 13.75% | 16% | pass |
| OpenAI | 0 | 0.00% | 13% | pass |
| Perplexity | 0 | 0.00% | 10% | pass |

Projected total: 80 canonical overall-effort points. No denominator-only or
duplicate work was created: sequence 14 produced a generic code scaffold,
sequence 15 produced the public architecture dissent, and sequence 16 repairs
the milestone-blocking foundation.

## Activation verdict

`READY_FOR_ONE_PRIMARY_CLAUDE_FABLE_5_ULTRA_MAX_DISPATCH`

The repair seed remains rejected evidence and is never the final product parent.
OpenAI will accept or reject only a mechanically materialized candidate whose
sole parent is `a6742a04a384a88e7342530041a1f0d3ab71db2c`.
