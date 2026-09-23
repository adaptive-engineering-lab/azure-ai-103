import { serviceRoleClient } from './clients.js';
import { loadSeedEnv } from '../seed/lib/env.js';

/**
 * Safety rails for running the integration suite against a hosted project.
 *
 * The suite is designed for a disposable local stack: it creates and deletes
 * auth users, and `partial-failure-rollback` deliberately pushes a failing
 * batch through the seed RPC. Pointed at a project that real users depend on,
 * a bug in a test becomes a bug in production data.
 *
 * Running against a hosted project is therefore opt-in per invocation, and the
 * bank is fingerprinted before and after so drift is caught rather than
 * discovered later.
 */

const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

export function isLocalStack(url = loadSeedEnv().supabaseUrl): boolean {
  try {
    return LOCAL_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Throws unless the target is a local stack or ALLOW_LIVE_TESTS=1 is set. */
export function assertSafeTarget(): void {
  const { supabaseUrl } = loadSeedEnv();
  if (isLocalStack(supabaseUrl)) return;
  if (process.env.ALLOW_LIVE_TESTS === '1') {
    console.warn(
      `\n  ⚠  Integration suite is running against a HOSTED project:\n` +
        `     ${supabaseUrl}\n` +
        `     It will create and delete auth users and exercise the seed RPC.\n` +
        `     Re-run \`pnpm seed\` afterwards to restore the bank.\n`,
    );
    return;
  }
  // Printed rather than embedded in the thrown message: vitest's stack parser
  // scans error text for locations and calls new URL() on anything URL-shaped,
  // so a bare URL here surfaces as "TypeError: Invalid URL" and hides this.
  console.error(
    [
      '',
      '  Refusing to run the integration suite against a non-local Supabase project.',
      `    Target host: ${new URL(supabaseUrl).hostname}`,
      '',
      '  These tests create and delete auth users and push deliberately failing',
      '  seed batches through the RPC. Against a live project that is destructive.',
      '',
      '  Preferred: start Docker, run "supabase start", and point tools/.env.local',
      '  at the local stack on port 54321.',
      '',
      '  To override deliberately:  ALLOW_LIVE_TESTS=1 pnpm test',
      '',
    ].join('\n'),
  );
  throw new Error('Integration suite blocked: target is not a local stack (see message above).');
}

export interface BankFingerprint {
  count: number;
  /** sha of the sorted id:content_hash pairs — detects edits, not just count drift. */
  digest: string;
}

/** Fingerprint the question bank so post-run drift is detectable. */
export async function fingerprintBank(): Promise<BankFingerprint> {
  const admin = serviceRoleClient();
  const { data, error } = await admin.from('questions').select('id, content_hash');
  if (error) throw new Error(`fingerprintBank failed: ${error.message}`);
  const rows = (data ?? []) as { id: string; content_hash: string }[];
  const joined = rows
    .map((r) => `${r.id}:${r.content_hash}`)
    .sort()
    .join('|');
  const { createHash } = await import('node:crypto');
  return { count: rows.length, digest: createHash('sha256').update(joined).digest('hex') };
}

export interface Residue {
  rollbackRows: number;
  testUsers: number;
}

/** Rows and users a clean run must not leave behind. */
export async function findResidue(): Promise<Residue> {
  const admin = serviceRoleClient();
  const { count } = await admin
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('topic', 'rollback-test');

  let testUsers = 0;
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const users = data?.users ?? [];
    if (users.length === 0) break;
    testUsers += users.filter(
      (u) => u.email?.startsWith('test+') && u.email.endsWith('@ai103game.test'),
    ).length;
    if (users.length < 200) break;
    page += 1;
  }
  return { rollbackRows: count ?? 0, testUsers };
}
