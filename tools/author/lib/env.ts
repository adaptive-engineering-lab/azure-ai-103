import 'dotenv/config';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENV_LOCAL = resolve(TOOLS_DIR, '.env.local');
if (existsSync(ENV_LOCAL)) loadDotenv({ path: ENV_LOCAL, override: true });

export class AuthorEnvError extends Error {
  readonly exitCode = 20;
}

export function getAnthropicKey(): string {
  const v = process.env.ANTHROPIC_API_KEY;
  if (!v) throw new AuthorEnvError('Missing ANTHROPIC_API_KEY. Set it in tools/.env.local or your shell.');
  return v;
}

/**
 * Authoring model. Opus 5 runs adaptive thinking by default when `thinking`
 * is omitted, which is what we want for item drafting — the work is
 * reasoning-heavy and runs offline, so quality matters far more than latency.
 *
 * Note that Opus 5 rejects `temperature`, `top_p` and `top_k` with a 400.
 * Nothing here sets them; do not add them back.
 */
export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL ?? 'claude-opus-5';
}
