# OpenAI preflight — Claude replacement result and materialization postflight

## Disposition

The sequence-16 recovery launcher now fails closed between provider process
completion and candidate QA. Provider exit `0` is not treated as a valid
handoff by itself.

The launcher freezes raw stdout and stderr, then invokes one independent
postflight. The postflight validates the terminal object against the exact
Director Draft-2020-12 schema, binds the frozen task/assignment/correlation,
requires one clean sole-parent provider commit across the exact 17 modified
`100644` leased paths, rejects remote containment, and checks the complete
36-path product delta before any ref mutation.

Only after every assertion passes may it create the reserved materialized
branch with compare-and-swap, using the exact provider tree and clean product
parent `a6742a04a384a88e7342530041a1f0d3ab71db2c`. It then rechecks the sole
parent, tree identity, clean worktree, final path set, and exclusion of rejected
seed `623ca52c5679b5348630f86eb88ecd48c9db82a1` from ancestry. QA must consume
the emitted machine-readable materialization manifest.

## Frozen tooling identities

- Recovery launcher SHA-256:
  `3a9fc4401c81d7cd32657685cd337d3d00b7dd3d065664e340b15c9f303ab2ad`
- Independent verifier/materializer SHA-256:
  `60a8b51d6de9bd63e37575d2a2507e313c9da55acdea95cb6eac7af53ef965be`
- Exact result-envelope binding SHA-256:
  `ea59d266227c92a18cf0f4013c643b844983858f502f744394a82218efe72436`
- Canonical result-schema Git blob:
  `ea3dbdf577b757a492ec4fcd53617a0fd9270800`
- Exact Director policy authority:
  `cc791364e2f1ff1ac4c72e01c7122296e4ff7362`, tree
  `51f529f07b453ec8e388d5634a569efb8cd2a881`

## Local validation

- Both PowerShell files parsed without errors.
- Python `3.14.5` with `jsonschema 4.26.0` is available for the independent
  Draft-2020-12 validation.
- A temporary schema-valid synthetic Claude wrapper was supplied with no
  provider commit present. The verifier exited `1` at the intended boundary:
  `Provider HEAD is still the repair seed; no candidate commit exists.`
- The temporary negative fixture was removed after the check.
- No branch, ref, worktree, source path, provider, paid route, build, test,
  device, Slack, Linear, GitHub, or other external effect was touched.

This evidence does not prove a provider candidate or milestone. It proves only
that the pre-provider recovery path and the post-provider handoff boundary are
now executable and fail closed.
