/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import reviewAndAdoption from "../../director/2026-08-25-pr71-review-and-adoption.md?raw";
import debateBrief from "../../director/committee/2026-08-25-debate-brief.md?raw";
import preStage from "../../director/prestage-rules-of-engagement.md?raw";
import projectProfile from "../../director/project-profile.yaml?raw";
import projectState from "../../director/project-state-report.md?raw";
import providerContract from "../../director/provider-roles-contract.yaml?raw";
import directorReadme from "../../director/README.md?raw";
import reshapedPlan from "../../director/reshaped-workstream-plan.md?raw";
import roles from "../../director/roles-and-responsibilities.md?raw";
import workload from "../../director/workload/2026-08-25-workload-and-delegation-plan.md?raw";
import workstream from "../../director/workstream-plan.md?raw";
import policy from "../../director/privacy-control-policy.md?raw";

const authorityFiles = {
  "director/2026-08-25-pr71-review-and-adoption.md": reviewAndAdoption,
  "director/committee/2026-08-25-debate-brief.md": debateBrief,
  "director/prestage-rules-of-engagement.md": preStage,
  "director/project-profile.yaml": projectProfile,
  "director/project-state-report.md": projectState,
  "director/provider-roles-contract.yaml": providerContract,
  "director/README.md": directorReadme,
  "director/reshaped-workstream-plan.md": reshapedPlan,
  "director/roles-and-responsibilities.md": roles,
  "director/workload/2026-08-25-workload-and-delegation-plan.md": workload,
  "director/workstream-plan.md": workstream,
  "director/privacy-control-policy.md": policy,
} as const;

describe("privacy governance", () => {
  it("prohibits regex-based privacy controls across active authority records", () => {
    const forbiddenPermissionClaims = [
      "regex-based privacy filtering are authorized",
      "regex-based privacy controls are not prohibited",
      "regex-based privacy filtering are permitted",
      "regex-based privacy controls are **permitted**",
      "regex filtering may be used as a supplemental control",
      "regex privacy controls are permitted",
    ];

    for (const [file, contents] of Object.entries(authorityFiles)) {
      const text = contents.toLowerCase();
      for (const claim of forbiddenPermissionClaims) {
        expect(text, `${file} contains superseded permission: ${claim}`).not.toContain(claim);
      }
    }
  });

  it("records no activation path in both machine-readable authority files", () => {
    for (const text of [projectProfile, providerContract]) {
      expect(text).toContain("regex_based_privacy_controls:");
      expect(text).toContain("permitted: false");
      expect(text).toContain('activation_path: "none"');
    }
  });

  it("requires structural replacement controls", () => {
    expect(policy).toContain("typed data-transfer object");
    expect(policy).toContain("explicit allowlist");
    expect(policy).toContain("fail closed");
    expect(policy).toContain("Never pass an authoritative or private object graph");
  });
});
