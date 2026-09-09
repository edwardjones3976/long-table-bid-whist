// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Runs a TypeScript entry module with Node's built-in type stripping (Node
 * 22.18+/24) and the repository's extensionless import style.
 *
 *   node scripts/native/run-ts.mjs <entry.ts> [args...]
 *
 * The entry module's exported `main(args)` is awaited when present.
 */
import { register } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [, , entry, ...args] = process.argv;
if (!entry) {
  process.stderr.write("usage: node scripts/native/run-ts.mjs <entry.ts> [args...]\n");
  process.exit(2);
}

register("./ts-resolve-hooks.mjs", import.meta.url);

const module = await import(pathToFileURL(resolve(entry)).href);
if (typeof module.main === "function") {
  const code = await module.main(args);
  if (typeof code === "number") process.exitCode = code;
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
