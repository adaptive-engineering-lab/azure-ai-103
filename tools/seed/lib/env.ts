import 'dotenv/config';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENV_LOCAL = resolve(TOOLS_DIR, '.env.local');
if (existsSync(ENV_LOCAL)) loadDotenv({ path: ENV_LOCAL, override: true });

export class EnvError extends Error {
  readonly exitCode = 20;
}

function require(name: string): string {
  return requireOneOf(name);
}

/**
 * Resolve the first of several accepted names that is actually set.
 *
 * Supabase renamed its API keys: `service_role` became the secret key
 * (`sb_secret_…`) and `anon` became the publishable key (`sb_publishable_…`).
 * Both formats are accepted by the same header, so a project issued new-style
 * keys works unchanged — only the variable name differs. Accepting either
 * spelling means a freshly created project's credentials drop straight in.
 *
 * The preferred (new) name is listed first and wins when both are set.
 */
function requireOneOf(...names: string[]): string {
  for (const name of names) {
    const v = process.env[name];
    if (v && v.length > 0) return v;
  }
  const list = names.join(' or ');
  throw new EnvError(
    `Missing required environment variable ${list}. Copy tools/.env.example to tools/.env.local and fill it in.`,
  );
}

export interface SeedEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey: string;
  dryRun: boolean;
}

export function loadSeedEnv(): SeedEnv {
  return {
    supabaseUrl: require('SUPABASE_URL'),
    serviceRoleKey: requireOneOf('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),
    anonKey: requireOneOf('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'),
    dryRun: process.env.DRY_RUN === '1',
  };
}
