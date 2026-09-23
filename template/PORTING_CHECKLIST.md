# Porting Checklist

Step-by-step list of what to change when forking this codebase for a new Microsoft exam. Order matters: do the type system and DB changes before you try to seed, or validation will fail.

Use this as a literal checklist — tick each item as you go.

---

## 1. Exam taxonomy

- [ ] Replace `exams.config.json` at the repo root with the new exam's config. Use `template/exams/_template.config.json` as a shell, or copy one of the filled-in examples (`az-900.config.example.json`, `ai-900.config.example.json`).
- [ ] Verify domain slugs are kebab-case and stable (you'll reuse them in DB, type system, and content).

---

## 2. Type system

File: [`frontend/src/lib/questions/types.ts`](../frontend/src/lib/questions/types.ts)

- [ ] Update the `Domain` string-literal union:

  ```ts
  // Before (DP-700):
  export type Domain =
    | 'implement-manage'
    | 'ingest-transform'
    | 'monitor-optimize'
    | 'implement-manage'
    | 'ingest-transform';

  // After (AZ-900 example):
  export type Domain =
    | 'cloud-concepts'
    | 'azure-architecture'
    | 'azure-management';
  ```

- [ ] Update the `DOMAINS` array (same slugs in array form).
- [ ] Update `DOMAIN_LABELS` map with the human-readable labels.

---

## 3. Database

### Option A — fresh Supabase project (recommended)

Easiest. Edit the migration in place before first `supabase db push`:

- [ ] Open [`supabase/migrations/0001_questions.sql`](../supabase/migrations/0001_questions.sql) and update the `questions_domain_chk` CHECK clause with the new slug list. Same for `questions_content_shape_chk` only if you're changing the type set.
- [ ] Boot a fresh Supabase project: `supabase start` (local) or create a cloud project + `supabase link`.
- [ ] Apply: `supabase db reset` (local) or `supabase db push --linked` (cloud).

### Option B — already-deployed project, swapping in place

- [ ] Copy `template/migrations/swap_domain_constraint.example.sql` to the next migration slot: `supabase/migrations/00XX_swap_domain_chk.sql`.
- [ ] Replace the slug list in the new file.
- [ ] If existing question rows reference old slugs you can't preserve, truncate the bank first.
- [ ] Apply.

---

## 4. Seed content

- [ ] Empty the bank:

  ```bash
  cp template/seed-content/flashcards.json supabase/seed/content/flashcards.json
  cp template/seed-content/mcq.json supabase/seed/content/mcq.json
  cp template/seed-content/code-review.json supabase/seed/content/code-review.json
  ```

- [ ] Author the first 10-20 questions for the new exam. Either by hand (referring to `template/seed-content/README.md` for the schema) or via `tools/author` CLI.
- [ ] Validate: `pnpm -C tools seed:validate` (expect "Validation complete: N items OK.")
- [ ] Seed: `pnpm -C tools seed`

---

## 5. Branding

### Exam identity (one place)

Every user-facing mention of the exam — page title, meta description, PWA
manifest, home hero, install prompt, countdown widget, Pro page, and both
legal pages — resolves from
[`frontend/src/lib/branding.ts`](../frontend/src/lib/branding.ts). You do not
edit those files any more.

Pick one of two routes:

- [ ] **Per-deployment (no code change).** Set these in `frontend/.env.local`
      and in the Vercel project, then rebuild. They are read at build time.

  ```bash
  VITE_EXAM_CODE=AZ-900
  VITE_EXAM_TITLE=Microsoft Azure Fundamentals
  VITE_CERT_TITLE=Azure Fundamentals
  ```

- [ ] **Committed default (for a permanent fork).** Change
      `BRANDING_DEFAULTS` in `branding.ts`. This is what renders when no
      environment variable is set, so a fork that will only ever be one exam
      should change it here and leave the variables unset.

`appName`, `shortName` and the meta/manifest description are derived from
`examCode`, so a one-line change re-skins the whole app. Verify with:

```bash
pnpm -C frontend build && grep -o '<title>[^<]*</title>' frontend/dist/index.html
```

### `frontend/vite.config.ts`

- [ ] Nothing to change for naming — the manifest and the HTML `<title>`,
      description, and storage key are injected from `branding.ts` and
      `storage/namespace.ts` by the `brandedHtml` plugin.
- [ ] (Optional) `theme_color` / `background_color` if you want a different
      launcher tint.

### `frontend/src/lib/storage/namespace.ts`

- [ ] Change `NAMESPACE` (e.g. `dp700game` → `az900game`).

  This is deliberately **not** derived from the exam code: it is a storage
  contract, and deriving it would mean a rename silently orphaned every
  existing user's saved progress. Change it only on a fresh deployment, or
  write a migration.

### `frontend/src/pages/HomePage.tsx`

- [ ] The eyebrow and headline read from `BRANDING`, so only the standing
      tagline needs a look — it names the domain count and the languages the
      code-review drills use, which are exam-specific:

  ```tsx
  <p className="mt-3 text-fg-muted">
    Quizzes and code-review drills across all three exam domains — with real
    PowerShell and ARM templates. Study in short sessions; come back tomorrow.
  </p>
  ```

### `frontend/src/pages/LearnIndexPage.tsx`

- [ ] If you set `gameModes.codeReview: false` in `exams.config.json`, hide the Code Review mode card. The page already keys off the flag — verify by running the dev server and looking at `/learn`.

### Other copy mentions

- [ ] grep for `DP-700` across the codebase and replace where it's user-facing (not in archived spec files):

  ```bash
  grep -rn "DP-700" --include="*.tsx" --include="*.ts" --include="*.html" --include="*.md" \
    frontend/ README.md vercel.json | grep -v "specs/"
  ```

- [ ] grep for the old exam title strings too (`Implementing Data Engineering Solutions`, `Fabric Data Engineer`, etc.).

### `README.md`

- [ ] Rewrite the project-level README hero, sections that mention DP-700 specifically, and the architecture diagram captions. Most of the doc is exam-agnostic and can stay.

---

## 6. Icon and brand visuals

- [ ] (Optional) Replace `frontend/public/icon.svg` with a new SVG icon for the new exam. The PWA manifest references it with `purpose: 'any maskable'` so an SVG is fine; no PNG variants required.
- [ ] (Optional) Adjust `theme_color` + `background_color` in `frontend/vite.config.ts` if you want a different launcher tint.

---

## 7. Deployment

### Supabase

- [ ] Create a new Supabase project in your target region.
- [ ] Capture the project ref, anon key, and service-role key.
- [ ] `supabase link --project-ref <new-ref>`
- [ ] `supabase db push --linked`
- [ ] Temporarily swap `tools/.env.local` to the cloud creds; run `pnpm -C tools seed`; swap back.
- [ ] Project Settings → Authentication → URL Configuration:
  - Site URL: `https://<your-vercel-project>.vercel.app/`
  - Redirect URL: `https://<your-vercel-project>.vercel.app/auth/callback`
  - (Add `http://localhost:5173/auth/callback` for local dev.)

### Vercel

- [ ] Create a new Vercel project, point at the new GitHub repo. `vercel.json` carries the build settings (builds in `frontend/`, publishes `frontend/dist`, SPA rewrite) — leave the dashboard's Framework Preset and build commands alone, since `vercel.json` overrides them.
- [ ] Set env vars for **both Production and Preview**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Vite bakes them in at build time, so set them before the first deploy or redeploy after.
- [ ] Trigger a deploy.
- [ ] Verify in browser: home page loads, console clean, "N questions across K domains" line reflects the new bank.
- [ ] Verify a deep link (e.g. `/learn/quiz`) returns the app on a hard reload, not a 404 — that exercises the SPA rewrite.
- [ ] Deployment Protection defaults to on for a team project. If the app should be publicly reachable, turn off Vercel Authentication (Project Settings → Deployment Protection) or the `.vercel.app` URLs will redirect visitors to a Vercel login.

### Optional: custom domain

- [ ] Buy / claim domain (e.g. `az-900.yourdomain.com`).
- [ ] Add as custom domain in Vercel; Vercel provisions the cert.
- [ ] Update Supabase Auth URLs to use the custom domain.

---

## 8. Privacy + Terms

- [ ] Open `frontend/src/pages/PrivacyPolicyPage.tsx` and `TermsOfServicePage.tsx`.
- [ ] Update the exam name from "DP-700 Study" to "AZ-900 Study" (or whatever).
- [ ] Confirm operator name, contact email, Supabase region, and governing jurisdiction are still correct (or update them).

---

## 9. Stripe (only if Pro tier is active for this exam)

If you're activating Pro on the new exam:

- [ ] Create a new Stripe product + recurring price for the new exam. (Stripe customers are per-account, so reuse your existing Stripe account.)
- [ ] Set Supabase secrets for the new project: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `APP_URL`.
- [ ] Deploy the three edge functions: `supabase functions deploy stripe-webhook --no-verify-jwt`, etc.
- [ ] Register the webhook URL in Stripe Dashboard.

If you're launching free-tier-only: do nothing. The billing surface gracefully shows "Free plan" for everyone.

---

## 10. Specs folder

- [ ] Decide what to keep. The 13 DP-700 specs document HOW each feature was built, which is useful reference material. But they're cluttered with DP-700-specific intent and STATUS notes.
- [ ] Options:
  - **Keep** as-is — historic reference, no harm.
  - **Archive** by moving `specs/` → `specs.dp-700/` and starting a fresh `specs/` for the new exam.
  - **Trim** to spec.md + plan.md only, dropping tasks.md (which is exam-specific and already executed).

For Option A (forking): archiving is usually right. For Option B (multi-exam in one repo): keep + reorganize.

---

## 11. CI workflows

- [ ] `.github/workflows/data-layer.yml` — exam-agnostic. No changes needed.
- [ ] `.github/workflows/lighthouse.yml` — exam-agnostic. No changes needed.
- [ ] `.lighthouserc.json` — the URL list includes route paths. If you set `gameModes.codeReview: false`, optionally remove `http://localhost/learn/code-review` from the list so Lighthouse doesn't try to audit a hidden route.

---

## 12. Final smoke test

- [ ] `pnpm -C frontend build` — succeeds with no type errors.
- [ ] `pnpm -C frontend test` — passes.
- [ ] `pnpm -C tools test` — passes (requires local Supabase running + bank seeded).
- [ ] Sign up with a real email on the production deployment.
- [ ] Verify `profiles` + `subscriptions` rows auto-create in the new Supabase project.
- [ ] Complete a session in each available mode; verify the row lands in `sessions`.
- [ ] Open `/progress`; verify the radar renders with the new domain labels.
- [ ] Open `/legal/privacy` and `/legal/terms`; verify exam name + operator details are updated.

---

## 13. Backlog (don't block launch on these)

- [ ] More content. Initial seed of 30-50 items is enough to play; 150-200 is needed for the spaced repetition system to feel rich.
- [ ] Custom domain.
- [ ] Stripe activation if you want Pro.
- [ ] Branch protection on `main` for the new repo.
- [ ] Spec-folder cleanup (option chosen in step 10).

---

## Rough effort

For someone who's done this once already and is forking AZ-900 / AI-900 from the DP-700 base:

- **Code changes**: 30 minutes (taxonomy + types + copy)
- **Initial content (30-50 items)**: 4-8 hours of authoring
- **Deployment + smoke test**: 30 minutes

So **half a day to a working public deploy** for a second exam, plus ongoing content authoring.
