import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Load .env files by walking up from a starting directory to the repo root.
 *
 * `import 'dotenv/config'` reads `.env` relative to `process.cwd()`, which is
 * whatever directory the command happened to be launched from — `tools/` under
 * `pnpm -C tools seed`, the repo root under a bare `tsx`. That made the file's
 * location silently load-bearing: credentials sitting one directory away from
 * where dotenv looked produced "Missing required environment variable
 * SUPABASE_URL" while the file was right there.
 *
 * Walking the tree removes the guesswork. A `.env` at the repo root, in
 * `tools/`, or beside the module that reads it all work, and the nearest file
 * wins.
 *
 * Precedence, highest first:
 *   1. Variables already in `process.env` (a real shell export, or CI).
 *   2. `.env.local` then `.env`, nearest directory first.
 *
 * Nothing overrides anything already set, which is dotenv's default and the
 * least surprising rule: an explicit `FOO=bar pnpm …` always wins.
 */
export function loadEnvFiles(startDir: string, stopDir?: string): string[] {
  const loaded: string[] = [];
  const stop = stopDir ? resolve(stopDir) : undefined;
  let dir = resolve(startDir);

  for (;;) {
    // .env.local before .env so the local override wins at the same level.
    for (const name of ['.env.local', '.env']) {
      const candidate = resolve(dir, name);
      if (existsSync(candidate)) {
        loadDotenv({ path: candidate });
        loaded.push(candidate);
      }
    }
    if (stop && dir === stop) break;
    const parent = dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }

  return loaded;
}

/** Human-readable list of the files that were loaded, for error messages. */
export function describeLoaded(loaded: string[]): string {
  return loaded.length === 0 ? 'no .env files were found' : `loaded: ${loaded.join(', ')}`;
}
