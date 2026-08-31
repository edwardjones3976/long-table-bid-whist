<!-- [[OpenAI Director | Codex | 2026-08-31 | 05:01 UTC | BEGIN]] -->
# GitHub Copilot CLI implementation prompt — LT-NATIVE-GITHUB-COPILOT-XRTEST-005

You are the sole writer for one clean-base Unreal XR test correction. Work only
in the current directory. Read and edit exactly the current-directory file
LongTableXRTests.cpp and no other path. Its absolute path is:

Unreal/Plugins/LongTableXR/Source/LongTableXR/Private/Tests/LongTableXRTests.cpp

The starting ref is 33aca6106603342efcf43fb813482cb18fd4b18c, tree
04f65bc3c72202977312cb38bc039460545daeec, branch
codex/copilot-xrtest-005, and target blob
a17ff010bfae135be5f27796fcdd34b76f1601c7. OpenAI already verified this exact
clean state. Shell and Git tools are denied, so do not try to reverify them.

Independently make exactly these three corrections:

1. Immediately before the above-maximum InteractionId decode, snapshot the
   current DecodeOut. Compare the rejected call's post-state to that immediate
   snapshot instead of the earlier Baseline.
2. Do the same immediately before the above-maximum TargetHandle decode.
3. Immediately after the exact-maximum ConfirmGeneration acceptance/value
   checks, snapshot DecodeOut, create a valid interaction JSON object whose
   ConfirmGeneration is static_cast<double>(MaxConfirmGeneration) + 1.0, prove
   decoding rejects it, and prove DecodeOut equals the immediate snapshot.

Also add this exact line as the first line of the file:

// [[GitHub Copilot CLI | github-copilot-cli/1.0.82-auto | 2026-08-31 | 05:01 UTC | BEGIN]]

Add this exact matching line as the last nonblank line:

// [[GitHub Copilot CLI | github-copilot-cli/1.0.82-auto | 2026-08-31 | 05:01 UTC | END]]

Preserve every existing assertion and test case, exact-boundary acceptance,
mode 100644 and LF endings. Do not edit production code. Do not read another
file. Do not use rejected Claude or Antigravity implementations, worktrees,
evidence or transcripts. Do not use shell, Git, web, MCP, remote, temporary,
subagent or external tools. Do not claim OpenAI acceptance or milestone
completion.

After the edit, return exactly one JSON object and nothing else: no Markdown,
fence, preface or second object. Use this complete shape, replacing only the
plain-language outcome/evidence strings as needed. Keep usage.model as auto
unless the CLI explicitly tells you the actual routed model.

{
  "schema_version": "1.0",
  "task_id": "LT-NATIVE-PROGRAM-20260830",
  "assignment_id": "LT-NATIVE-GITHUB-COPILOT-XRTEST-005",
  "idempotency_key": "LT-NATIVE-GITHUB-COPILOT-XRTEST-005-33aca61",
  "authority_snapshot_digest": "sha256:3a27e06fbd96a346f6befbe74c52af2046e323a27b59316dc9fd81d9f4da05b6",
  "correlation": {
    "correlation_id": "LT-NATIVE-GITHUB-COPILOT-XRTEST-005",
    "source_event_id": "openai-antigravity-xrtest-terminal-new-provider-fallback-20260831",
    "slack_thread_ts": "1788068481.517609",
    "github_issue": null,
    "github_pull_request": null
  },
  "provider": "GitHub Copilot CLI",
  "run_reference": "github-copilot-cli:LT-NATIVE-GITHUB-COPILOT-XRTEST-005",
  "status": "SUCCEEDED",
  "outcome": "Implemented the bounded sole-file XR test correction.",
  "artifacts": [
    {
      "kind": "edited_file",
      "location": "LongTableXRTests.cpp",
      "digest": null
    }
  ],
  "checks": [],
  "acceptance": [
    {"check": "sole-file boundary", "status": "PASS", "evidence": "Only LongTableXRTests.cpp was read and edited."},
    {"check": "fresh contribution envelope", "status": "PASS", "evidence": "The exact required BEGIN and END lines were added at the outer boundaries."},
    {"check": "InteractionId immediate snapshot", "status": "PASS", "evidence": "The rejected call is compared to its immediate pre-call DecodeOut snapshot."},
    {"check": "TargetHandle immediate snapshot", "status": "PASS", "evidence": "The rejected call is compared to its immediate pre-call DecodeOut snapshot."},
    {"check": "ConfirmGeneration above-maximum coverage", "status": "PASS", "evidence": "The above-maximum value is rejected and DecodeOut is compared to its immediate snapshot."},
    {"check": "OpenAI build and tests", "status": "NOT_RUN", "evidence": "OpenAI owns authoritative QA."}
  ],
  "risks": [],
  "blockers": [],
  "requested_decisions": [],
  "side_effects": [],
  "usage": {
    "model": "auto",
    "input_tokens": null,
    "output_tokens": null,
    "total_tokens": null,
    "cost_usd": null
  },
  "revision_recommended": false
}

<!-- [[OpenAI Director | Codex | 2026-08-31 | 05:01 UTC | END]] -->
