// [[OpenAI Codex | GPT-5.6 | 2026-09-01 | 00:05 UTC | BEGIN]]
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const CONFIGS = [
  "tsconfig.app.json",
  "tsconfig.node.json",
  "scripts/native/tsconfig.native.json",
] as const;

describe("TypeScript configuration", () => {
  it("does not suppress dependency declaration errors", () => {
    for (const relativePath of CONFIGS) {
      const config = JSON.parse(readFileSync(resolve(relativePath), "utf8")) as {
        compilerOptions?: { skipLibCheck?: boolean };
      };

      expect(config.compilerOptions?.skipLibCheck, relativePath).not.toBe(true);
    }
  });
});
// [[OpenAI Codex | GPT-5.6 | 2026-09-01 | 00:05 UTC | END]]
