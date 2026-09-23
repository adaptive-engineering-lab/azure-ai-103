import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolveBranding } from './src/lib/branding';
import { STATE_KEY } from './src/lib/storage/namespace';

/**
 * Fill the placeholders in index.html from the resolved branding.
 *
 * Vite substitutes `%VITE_FOO%` in HTML natively, but leaves the literal text
 * in place when the variable is unset — a missing env would ship a tab titled
 * "%VITE_EXAM_CODE% Study". Going through resolveBranding() means an unset
 * variable falls back to the committed default instead.
 *
 * STATE_KEY is injected for the same reason: the inline theme script runs
 * before any bundle parses, so it cannot import the namespace module, and it
 * was the one place the storage key had to be duplicated by hand.
 */
function brandedHtml(env: Record<string, string | undefined>): Plugin {
  const branding = resolveBranding(env);
  const values: Record<string, string> = {
    APP_NAME: branding.appName,
    APP_DESCRIPTION: branding.description,
    STORAGE_STATE_KEY: STATE_KEY,
  };
  return {
    name: 'branded-html',
    transformIndexHtml(html) {
      return html.replace(/%(APP_NAME|APP_DESCRIPTION|STORAGE_STATE_KEY)%/g, (_, key: string) =>
        values[key] ?? '',
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  // '.' is the env directory, resolved against the working directory Vite
  // already runs in, which avoids pulling @types/node in for one process.cwd()
  // call. '' as the prefix loads every variable, not just VITE_-prefixed ones,
  // so the config sees exactly what .env.local defines.
  const env = loadEnv(mode, '.', '');
  const branding = resolveBranding(env);

  return {
  plugins: [
    react(),
    brandedHtml(env),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: branding.appName,
        short_name: branding.shortName,
        description: branding.description,
        theme_color: '#0078D4',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Cache the question bank reads (anon) — RLS keeps user data out.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/questions/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'questions-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
        // 25 MB total budget; never cache user-data tables.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  };
});
