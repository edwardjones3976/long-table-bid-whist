// [[OpenAI Codex | GPT-5.6 | 2026-08-31 | 23:57 UTC | BEGIN]]
/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import canary from "../../director/native-program/langgraph-canary.yaml?raw";

const requiredProviders = [
  "openai",
  "claude",
  "cursor",
  "grok",
  "antigravity",
  "perplexity",
  "firecrawl",
  "github",
  "windows-copilot",
] as const;

describe("Long Table LangGraph canary registration", () => {
  it("binds only the accepted immutable baseline", () => {
    expect(canary).toContain("schema: long-table-langgraph-canary/v1");
    expect(canary).toContain("commit: 4d26680fb99abacb20ecb18807b7c8833646cfa3");
    expect(canary).toContain("tree: 1e0db56f1e85d66c93ab64bc3dca8c237947c210");
    expect(canary).toContain("mutable_ref_authority: false");
    expect(canary).toContain(
      "implementation_commit: fa2c4f6e4c333cc41594956dbfd0aff0e3fa67cf",
    );
    expect(canary).not.toContain("fb729579");
  });

  it("is a disabled, paid-off, zero-effect registration", () => {
    expect(canary).toContain("mode: disabled");
    expect(canary).toContain("enabled: false");
    expect(canary).toContain("new_intake_owner: legacy");
    expect(canary).toContain("legacy_new_intake_disabled: false");
    expect(canary).toContain("writer_lease_requested: false");
    expect(canary).toContain("dispatch_enabled: false");
    expect(canary).toContain("parallel_dispatch_enabled: false");
    expect(canary).toContain("paid_execution_enabled: false");
    expect(canary).toContain("slack_intake_enabled: false");
    expect(canary).toContain("github_write_enabled: false");
    expect(canary).toContain("repository_write_enabled: false");
    expect(canary).toContain("merge_enabled: false");
    expect(canary).toContain("deployment_enabled: false");
    expect(canary).toContain("publication_enabled: false");
  });

  it("registers every requested surface without granting provider authority", () => {
    for (const provider of requiredProviders) {
      expect(canary).toContain(`    - ${provider}`);
    }
    expect(canary).toContain("provider_result_grants_acceptance: false");
    expect(canary).toContain("assignment_acceptance_grants_product_completion: false");
    expect(canary).toContain("concealed_state_provider_projection: none");
  });

  it("preserves game authority and structural privacy", () => {
    expect(canary).toContain("game_authority_unchanged: true");
    expect(canary).toContain("table_authority_owner: services/table-authority");
    expect(canary).toContain("rules_authority_owner: packages/rules-core");
    expect(canary).toContain("unreal_adjudication_allowed: false");
    expect(canary).toContain("regex_based_privacy_controls_permitted: false");
  });

  it("cannot claim activation before every deterministic gate", () => {
    const requiredGates = [
      "immutable_commit_and_tree_verified",
      "director_postgres_checkpoint_ready",
      "claim_and_effect_ledgers_ready",
      "reconciliation_worker_ready",
      "valid_langgraph_writer_fence",
      "legacy_new_intake_disabled_before_writer_acquisition",
      "all_required_provider_apps_live_ok",
      "all_required_provider_runtime_adapters_live_ok",
      "zero_duplicate_effect_fault_evidence",
      "disposable_backup_restore_verified",
      "owner_authorizes_any_external_effect",
    ];
    for (const gate of requiredGates) {
      expect(canary).toContain(`  - ${gate}`);
    }
    expect(canary).toContain("may_claim_primary_runtime_active: false");
    expect(canary).toContain("may_claim_product_complete: false");
  });
});
// [[OpenAI Codex | GPT-5.6 | 2026-08-31 | 23:57 UTC | END]]
