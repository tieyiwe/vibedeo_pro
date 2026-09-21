# Vibedeo

AI video generation at a fraction of the cost of Runway, Pika or Sora — built on
[Seedance](https://www.byteplus.com/) for generation and Claude for prompt work.

Two things are core to the product, not bolt-ons:

- **Character consistency** — define a character once (reference image and/or a
  text sketch), and it reappears with the same face, build and outfit in every
  clip.
- **Pixar-style 3D animation** — a first-class style preset, alongside
  realistic, anime and claymation.

Single deployable Next.js 15 app. On Replit, the database, object storage, app
and hosting all live on one platform.

---

## Stack

| Piece | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 |
| Database | Replit Postgres via Prisma |
| Auth | Auth.js (NextAuth v5) — email/password + Google, sessions as JWT, users in Postgres |
| Storage | Replit Object Storage (local filesystem fallback for dev) |
| Payments | Stripe Checkout (one-time credit packs + a monthly plan) |
| Video | Seedance API (mock mode when no key is set) |
| Prompts | Anthropic Claude (local fallback when no key is set) |
| Queue | `generations.status` in Postgres, drained by a polling route |

---

## Quick start (local)

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL + AUTH_SECRET at minimum
npx prisma migrate deploy     # or `npx prisma migrate dev` while iterating
npm run dev                   # http://localhost:3000
```

With no `SEEDANCE_API_KEY` the app runs in **mock mode**: jobs queue, "render"
for a few seconds and complete with a placeholder clip, so the whole loop
(credits → queue → history → download) is testable offline. With no
`ANTHROPIC_API_KEY` the prompt enhancer and character-description writer fall
back to a deterministic local rewrite.

---

## Running on Replit

1. **Database pane → PostgreSQL.** This sets `DATABASE_URL` in Secrets.
2. **Storage pane → create an Object Storage bucket.** This sets the bucket id.
3. **Secrets pane →** add everything from `.env.example` that applies.
   `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` must be your public Replit URL
   (`https://<repl>.<user>.repl.co`) — Seedance fetches first-frame images and
   share links from that origin.
4. **Shell →**
   ```bash
   npm install
   npx prisma migrate deploy
   npm run build && npm run start
   ```
5. Enable **Always On** (or use a Reserved VM / Autoscale deployment) so
   in-flight renders keep progressing.

`.replit` already sets the run command, the deploy build (`npm ci &&
prisma migrate deploy && npm run build`) and maps port 3000 → 80.

### Google sign-in

Create OAuth credentials in Google Cloud Console and set the redirect URI to
`<NEXTAUTH_URL>/api/auth/callback/google`, then set `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET`. Without them the Google button simply isn't rendered —
email/password works on its own.

### Stripe

Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and point a
webhook at `<APP_URL>/api/webhooks/stripe` for `checkout.session.completed`,
`invoice.paid` and `customer.subscription.deleted`; put its signing secret in
`STRIPE_WEBHOOK_SECRET`. Credit packs are defined in `lib/stripe.client.ts`
(prices are created inline, so there's nothing to configure in the Stripe
dashboard).

### Background worker

Renders continue even if the user closes the tab, as long as something drains
the queue. Add a Replit Scheduled Deployment (or any cron) hitting:

```bash
curl -X POST -H "x-worker-secret: $WORKER_SECRET" "$APP_URL/api/worker/poll"
```

The browser polls `/api/generate/status` too, so this is belt-and-braces.

---

## How the pieces fit

```
prompt ──▶ (optional) Claude rewrite ──▶ composePrompt() ──▶ Seedance job
                                             ▲                    │
                          character locked description            │ async
                          + style preset suffix                   ▼
history ◀── object storage ◀── syncGeneration() ◀── polling / webhook
```

**Final prompt = character locked description + user prompt + style suffix.**
Subject first, style last, so style words are never read as part of the
character's identity (`lib/characters.ts`).

### Character consistency

Prompt engineering is the reliable baseline and always applies:

1. On save, Claude turns the sketch and/or reference image into a
   `lockedDescription` — species, face, hair, colours, full outfit,
   distinguishing marks, and nothing about pose, setting or lighting.
2. That paragraph is copied **verbatim** into every prompt using the character.
3. A stable per-character seed is derived and sent as `--seed`.

Seed locking and reference-image conditioning are enhancements layered on top —
how strong they are depends on what your Seedance plan exposes. Check your API
docs for (1) seed support and (2) image conditioning, and see the TODO at the
top of `lib/seedance.ts`.

### Pixar-style output

`lib/stylePresets.ts` holds one prompt suffix per style. These are a starting
point: expect to re-tune the wording — especially `pixar_3d` — once you can
compare real Seedance output against the look you want. It's a single constant,
deliberately.

### Credits

1 credit per second at 480p/720p, 2 per second at 1080p (`lib/pricing.ts`).
New accounts get 20. Deduction is a conditional `UPDATE ... WHERE credits >= n`,
so parallel requests can't overdraw. Failed or timed-out generations are
refunded automatically, and every movement is written to `credit_transactions`.

### Access control

Plain Postgres has no row-level security, so it's enforced in code: every route
resolves the caller through `requireUserId()` (`lib/auth.ts`) and scopes its
Prisma queries by that id. Object keys are namespaced `<folder>/<userId>/...`
and served by `/api/files/[...key]`, which accepts either the signed-in owner or
a URL carrying an HMAC of the key — that's what lets Seedance fetch a first
frame and share links work without making the bucket public.

---

## Environment variables

See `.env.example`. The only hard requirements are `DATABASE_URL` and
`AUTH_SECRET`; everything else degrades gracefully (mock generation, local
fallback prompts, hidden Google button, disabled checkout).

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + `next build` |
| `npm run start` | Production server on `$PORT` (default 3000) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create + apply a migration in dev |
| `npm run db:push` | Push the schema without a migration |
| `npm run db:studio` | Prisma Studio |

---

## Portability

Built on Replit primitives, but structured so moving to Supabase (or any managed
Postgres) is a three-file change:

- all database access goes through Prisma (`lib/prisma.ts`), no raw SQL, no
  Replit-specific extensions;
- all file storage goes through `lib/storage.ts` — nothing else imports
  `@replit/object-storage`;
- all auth goes through `lib/auth.ts` — no session checks scattered through
  routes or components.

## Not in this pass

See `FUTURE_FEATURES.md`.
