import { defineConfig } from 'vitest/config';

/**
 * Unit tests for tools logic that needs no database.
 *
 * Separate from vitest.config.ts because that one loads
 * test-helpers/global-setup.ts, which refuses to run against anything but a
 * local Supabase stack — a correct guard for the integration suite, since
 * those tests write rows and create users. It also meant there was no way to
 * test pure logic without standing up Docker, so logic that deserved a test
 * went untested. This config closes that gap.
 */
export default defineConfig({
  test: {
    include: ['unit/**/*.test.ts'],
    testTimeout: 10000,
  },
});
