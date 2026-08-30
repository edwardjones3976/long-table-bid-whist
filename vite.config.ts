import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Mirrors `LOCAL_DEVELOPMENT_BUILD` in `src/build-identity.ts`. A build that was
 * not given a commit sha says so plainly instead of inventing one.
 */
const LOCAL_DEVELOPMENT_BUILD = 'local-development';

/** Literal stand-in inside `index.html`, replaced at build time. */
export const BUILD_SHA_PLACEHOLDER = '__BUILD_SHA__';

/**
 * A relative base keeps every asset URL mount-point independent, so the same
 * `dist` serves from the GitHub Pages project path and from a local root.
 */
export const PAGES_COMPATIBLE_BASE = './';

export function buildShaMetadataValue(injected: string | undefined): string {
  const trimmed = injected?.trim();
  return trimmed ? trimmed : LOCAL_DEVELOPMENT_BUILD;
}

export function injectBuildShaMetadata(html: string, injected: string | undefined): string {
  return html.split(BUILD_SHA_PLACEHOLDER).join(buildShaMetadataValue(injected));
}

/**
 * Writes the full injected commit sha into fixed `index.html` metadata so the
 * served page carries its own build identity without running any script. The
 * short sha shown on the desktop page and in the XR room stays with
 * `src/build-identity.ts`.
 */
function buildShaMetadata(): Plugin {
  let injectedSha: string | undefined;
  return {
    name: 'long-table-build-sha-metadata',
    configResolved(config) {
      // The same resolved env that backs `import.meta.env`, so the fixed
      // metadata and the on-page short sha can never disagree.
      injectedSha = config.env.VITE_BUILD_SHA;
    },
    transformIndexHtml(html) {
      return injectBuildShaMetadata(html, injectedSha);
    },
  };
}

export default defineConfig({
  // Vite maps './' back to '/' for the dev server.
  base: PAGES_COMPATIBLE_BASE,
  plugins: [react(), buildShaMetadata()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/_restart_archive/**', '**/_provider_worktrees/**'],
  },
});
