# Load tests

Two k6 scripts covering the only paths that scale with user count.

> **These generate real traffic against real infrastructure.** They are not
> wired into CI on purpose — a push trigger would point 100 virtual users at a
> free-tier Supabase project on every commit. Run them deliberately.
>
> **`bank-read.js` costs about 3 GB of Supabase egress per run.** The Supabase
> free tier includes 5 GB per month, so two runs in a month exhausts it. Every
> request pulls the whole bank (~72 KB), and the script issues ~41,000 of them.
> Lower the `stages` targets, or shorten the run, if you only need a smoke test.

## Install k6

```bash
brew install k6          # macOS
# or see https://grafana.com/docs/k6/latest/set-up/install-k6/
```

## Run

```bash
# Guest read path — the anonymous question-bank fetch
set -a; . ./.env; set +a
SUPABASE_URL="$SUPABASE_URL" \
SUPABASE_ANON_KEY="$SUPABASE_PUBLISHABLE_KEY" \
  k6 run tests/load/bank-read.js

# App shell + CDN cache headers + SPA deep-link rewrite
APP_URL=https://azure-ai-103.vercel.app k6 run tests/load/static-shell.js
```

## What each one is for

| Script | Path | Why it matters |
| --- | --- | --- |
| `bank-read.js` | `GET /rest/v1/questions` via PostgREST | The only server call a guest makes. Ramps to 100 VUs. Fails if error rate exceeds 1% or p95 exceeds 1000ms — the same budget as `tests/contract/query-latency.test.ts`. |
| `static-shell.js` | Vercel CDN | Asserts `index.html` is revalidated, hashed assets are `immutable`, and a deep link like `/learn/quiz` is rewritten to the SPA rather than 404ing. Catches a `vercel.json` regression. |

## Measured baseline (2026-08-06, eu-west-2, 86-item bank)

| Script | VUs | Requests | Failures | p95 | Notes |
| --- | --- | --- | --- | --- | --- |
| `bank-read.js` | 100 | 41,345 | 0.00% | 406ms | 306 req/s, 3.0 GB egress |
| `static-shell.js` | 100 | 28,528 | 0.00% | 229ms (shell) | all cache-header checks passed |

Both comfortably inside budget. The read path is not the constraint at this
scale — see the egress note at the top for what actually is.

## Interpreting the results

The guest path is a read of a small, public, cacheable table, so the expected
outcome is that 100 VUs is uneventful. Watch for:

- **`http_req_failed` climbing** — rate limiting or connection exhaustion on the
  Supabase side, which is the real ceiling on a free-tier project.
- **p95 rising with VUs while median stays flat** — queueing rather than slow
  queries.
- **`asset is immutable` failing** — the cache headers regressed, and every user
  is re-downloading the bundle.

For reference, `tests/integration/concurrency.test.ts` measures the same read at
50-way parallelism from a single Node process and completes in well under a
second. If k6 shows something dramatically worse, the difference is network and
connection setup, not the database.

## Related tests

- `tests/integration/concurrency.test.ts` — correctness under simultaneous use
  (RLS isolation, unique-constraint contention, read/write interleaving).
- `tests/contract/query-latency.test.ts` — the p95 gate that runs in CI.
