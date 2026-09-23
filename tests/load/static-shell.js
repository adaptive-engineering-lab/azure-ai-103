import http from 'k6/http';
import { check } from 'k6';

/**
 * The Vercel CDN path: the app shell every user downloads before anything else.
 *
 * This should be nearly free — index.html is small and the hashed assets are
 * served `immutable`, so a returning user fetches almost nothing. The test
 * exists to catch the cache headers in vercel.json silently regressing, which
 * would turn a cached load into a full re-download for every user.
 *
 * Run:
 *   APP_URL=https://azure-ai-103.vercel.app k6 run tests/load/static-shell.js
 */

const APP_URL = (__ENV.APP_URL || 'https://azure-ai-103.vercel.app').replace(/\/$/, '');

export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '40s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    // CDN-served static content; if this is slow something is badly wrong.
    'http_req_duration{name:shell}': ['p(95)<800'],
  },
};

export function setup() {
  // Discover a hashed asset from the shell so the test survives every rebuild.
  const res = http.get(`${APP_URL}/`, { tags: { name: 'shell' } });
  const match = res.body && res.body.match(/\/assets\/[A-Za-z0-9._-]+\.js/);
  return { assetPath: match ? match[0] : null };
}

export default function (data) {
  const shell = http.get(`${APP_URL}/`, { tags: { name: 'shell' } });
  check(shell, {
    'shell 200': (r) => r.status === 200,
    'shell is revalidated, not cached forever': (r) =>
      (r.headers['Cache-Control'] || '').includes('must-revalidate'),
  });

  // A deep link must reach the SPA rather than 404 — this is the rewrite rule
  // in vercel.json, and it is the thing that breaks when hosting is swapped.
  const deep = http.get(`${APP_URL}/learn/quiz`, { tags: { name: 'deep-link' } });
  check(deep, { 'deep link served by the SPA': (r) => r.status === 200 });

  if (data.assetPath) {
    const asset = http.get(`${APP_URL}${data.assetPath}`, { tags: { name: 'asset' } });
    check(asset, {
      'asset 200': (r) => r.status === 200,
      'asset is immutable': (r) => (r.headers['Cache-Control'] || '').includes('immutable'),
    });
  }
}
