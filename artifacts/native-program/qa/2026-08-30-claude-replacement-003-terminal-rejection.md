<!-- [[OpenAI Director | Codex | 2026-08-31 | 03:01 UTC | BEGIN]] -->
# Claude replacement foundation — terminal OpenAI rejection

## Disposition

`LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003` is terminal
`OPENAI_CHANGES_REQUIRED_PROVENANCE_ONLY`.

Claude's single authorized transient recovery completed one schema-valid result
and provider commit `88efd4ff9434e136c758da350795163a7f8fd2a8`, tree
`0c5963cad9da6256489dade2b24d90a4be7d98b2`, with sole repair-seed parent
`623ca52c5679b5348630f86eb88ecd48c9db82a1`. Independent postflight copied the
exact 17 provider blobs plus retained seed blobs onto sole product parent
`a6742a04a384a88e7342530041a1f0d3ab71db2c`, producing local-only candidate
`cb7b49b9a12584fbae6167c4072da3f2286a1cc8` with the identical provider tree.
The rejected seed is not in product ancestry.

The assignment earns medium/5 overall-effort points once and zero accepted
direct-production points. The candidate is technically green but is not an
accepted dependency because its provenance contract failed.

## Bound transport and materialization

- Provider run: `claude-code:aa652fcd-6326-4029-92ef-dfd9ba87b955`.
- Raw Claude wrapper SHA-256:
  `bd6749af1188a821ed05a5bc8c40e3034392e3ca8b615433851bb1846edc9ced`.
- Provider stderr was empty, SHA-256
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;
  the empty taggable file is not retained in Git.
- Terminal result packet SHA-256:
  `915dcfc28fa74b07c181c38bd2b711fd28400f5188b094a90ed28a8ea2207e73`.
- Provider result reported `SUCCEEDED`; all 17 leased paths were modified once,
  no mode changed, the provider worktree was clean, and no provider push or
  external effect occurred.
- The independent materializer verified exact schema/identity binding, the
  sole provider parent, all 17 blob identities, the exact 36-path final product
  delta, a clean materialized worktree, and exclusion of the rejected seed from
  final ancestry.
- List-equivalent usage telemetry was approximately USD 33.46 through the
  authenticated Claude Max route; no incremental API charge is established.

## Independent OpenAI gates on exact materialized candidate

- Real-socket coalesced policy-close convergence probe: `PASS` after the
  OpenAI-owned probe was updated to supply the now-mandatory incarnation bundle;
  no candidate byte changed.
- Strict TypeScript: `PASS`.
- Focused authority/session suites: 4 files, 52/52 tests passed.
- Fixture-current check: 11 files current.
- Production web build: `PASS`.
- Full CI-equivalent LF suite from a clean detached exact-candidate checkout:
  25 files, 219/219 tests passed.
- The normal Windows checkout reproduced 9 line-ending-sensitive Pages test
  failures. Exact candidate and product parent carry identical workflow/test
  blobs, the same 9 failures reproduced on the parent, and the LF checkout was
  green. This is not a candidate regression.
- UE5.7 `LongTableEditor` Win64 Development build: `PASS`.
- UE5.7 `LongTable` Win64 Development build: `PASS`.
- Unreal `LongTable` automation: 26 succeeded, 8 succeeded with expected
  fail-closed warnings, 0 failed, 0 not run; 34/34 total green.
- Structural privacy review found positive typed construction only, no new
  media/network/dependency, no grant/counter/incarnation leakage into public or
  dealer surfaces, and no regex, blacklist, scanning, sanitizing, redaction or
  serialize-then-delete privacy control.

## Terminal provenance finding

The provider reported that no contribution marker was deleted, renamed or
reassigned. Exact product-parent/candidate comparison disproves that statement:
in `Unreal/Source/LongTableTable/Private/LongTableCommitMachine.cpp`, the
pre-existing outer pair

`LT-NATIVE-CLAUDE-001 BEGIN` / `LT-NATIVE-CLAUDE-001 END`

changed from one pair on product parent `a6742a0` to zero pairs on candidate
`cb7b49b`. It was replaced by the `LT-NATIVE-CLAUDE-001-R1` pair rather than
preserved around it. The new replacement markers are balanced 69/69 and no
other per-file imbalance exists, but balanced additions do not cure deletion of
an inherited pair. The frozen packet required the final marker multiset to have
no deletion, imbalance, renaming or reassignment.

OpenAI therefore fails closed. Green code and executable gates cannot override
the false terminal acceptance claim or the immutable provenance requirement.
OpenAI may not author the product correction.

## Smallest authorized kickback

New assignment `LT-NATIVE-CLAUDE-PROVENANCE-004` gives Claude exactly one file
and one primary attempt to restore the two inherited marker lines and add a new
balanced correction envelope. It permits no executable change, no other path,
no recovery, no revision and no broad provider round. OpenAI will independently
verify and test the resulting exact candidate.
<!-- [[OpenAI Director | Codex | 2026-08-31 | 03:01 UTC | END]] -->
