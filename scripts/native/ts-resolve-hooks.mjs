// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Module resolution hook for running the TypeScript sources directly under
 * Node's built-in type stripping. The repository's bundler-style imports omit
 * the `.ts` extension; this hook tries `<specifier>.ts`, `<specifier>.tsx`
 * and `<specifier>/index.ts` for relative specifiers before deferring to the
 * default resolver. Nothing here inspects file contents.
 */
import { existsSync, statSync } from "node:fs";
import { dirname, extname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function isFile(candidate) {
  return existsSync(candidate) && statSync(candidate).isFile();
}

export async function resolve(specifier, context, nextResolve) {
  const relative = specifier.startsWith("./") || specifier.startsWith("../");
  if (relative && extname(specifier) === "") {
    const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : join(process.cwd(), "index.mjs");
    const base = resolvePath(dirname(parentPath), specifier);
    for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
      if (isFile(candidate)) return nextResolve(pathToFileURL(candidate).href, context);
    }
  }
  return nextResolve(specifier, context);
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
