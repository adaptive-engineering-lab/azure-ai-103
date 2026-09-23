import { serviceRoleClient } from './clients.js';
import { assertSafeTarget, fingerprintBank, findResidue, isLocalStack } from './guard.js';

/**
 * Vitest globalSetup. Fails fast with an actionable message if the Supabase
 * stack isn't reachable, so contributors don't waste time chasing confusing
 * test errors that all stem from "you didn't run `supabase start`".
 *
 * When the target is a hosted project (opt-in via ALLOW_LIVE_TESTS=1), the
 * question bank is fingerprinted here and re-checked in teardown, so a test
 * that mutates content is caught immediately rather than silently corrupting
 * the bank.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  assertSafeTarget();

  let client;
  try {
    client = serviceRoleClient();
  } catch (e) {
    throw new Error(
      `Test environment not configured. ${(e as Error).message}\n` +
        `Run: cp tools/.env.example tools/.env.local and fill in keys from \`supabase start\`.`,
    );
  }

  // A plain GET, not a head:true count. A HEAD response carries no body, so
  // when the probe failed there was nothing for supabase-js to build a message
  // from and this threw with an empty reason — blind exactly when it fires.
  const { error } = await client.from('questions').select('id').limit(1);
  if (error) {
    const detail = [error.message, error.code && `code ${error.code}`, error.details, error.hint]
      .filter(Boolean)
      .join(' | ');
    throw new Error(
      `Supabase stack not reachable or migrations not applied: ${detail || '(no detail returned)'}\n` +
        `Run: supabase start (and supabase db reset if migrations changed).`,
    );
  }

  // Drift checking only earns its keep against a project worth protecting.
  if (isLocalStack()) return async () => {};

  const before = await fingerprintBank();
  console.log(`  bank fingerprint: ${before.count} items, ${before.digest.slice(0, 12)}…`);

  return async function teardown(): Promise<void> {
    const after = await fingerprintBank();
    const residue = await findResidue();
    const problems: string[] = [];

    if (after.count !== before.count) {
      problems.push(`question count changed: ${before.count} → ${after.count}`);
    } else if (after.digest !== before.digest) {
      problems.push(`question content changed (same row count, different hashes)`);
    }
    if (residue.rollbackRows > 0) {
      problems.push(`${residue.rollbackRows} leftover row(s) with topic='rollback-test'`);
    }
    if (residue.testUsers > 0) {
      problems.push(`${residue.testUsers} leftover test user(s) @ai103game.test`);
    }

    if (problems.length > 0) {
      // Loud, but non-fatal: failing teardown would mask the real test results.
      console.error(
        `\n  ⚠  The suite left the hosted project changed:\n` +
          problems.map((p) => `     - ${p}`).join('\n') +
          `\n     Run \`pnpm -C tools seed\` to restore the bank.\n`,
      );
    } else {
      console.log('  bank unchanged, no residue — hosted project is as it was.');
    }
  };
}
