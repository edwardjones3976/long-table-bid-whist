// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Build identity.
 *
 * `VITE_BUILD_SHA` is injected by CI at build time. When it is absent — which is
 * the normal case for a developer running `npm run dev` — we say so plainly
 * rather than inventing a commit that this bundle was not built from.
 */
export const LOCAL_DEVELOPMENT_BUILD = "local-development" as const;

const SHORT_SHA_LENGTH = 7;

function readInjectedSha(): string | null {
  const raw = import.meta.env?.VITE_BUILD_SHA;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function shortenSha(sha: string | null): string {
  if (!sha) return LOCAL_DEVELOPMENT_BUILD;
  return sha.length > SHORT_SHA_LENGTH ? sha.slice(0, SHORT_SHA_LENGTH) : sha;
}

/** Full injected commit sha, or the honest local-development marker. */
export const BUILD_SHA: string = readInjectedSha() ?? LOCAL_DEVELOPMENT_BUILD;

/** Short sha for display on the desktop page and inside the XR room. */
export const BUILD_SHORT_SHA: string = shortenSha(readInjectedSha());

export const BUILD_LABEL = `Build ${BUILD_SHORT_SHA}`;
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
