# Vibedeo MVP — Specification Review and Tightened Build Plan

Source reviewed: `Pasted--Vibedeo-Master-Build-Prompt-for-Claude-Code-Replit-Pas_1790028623699.txt`

## Executive assessment

The brief has a strong product thesis and a sensible first loop:

> prompt or image → optional enhancement → Seedance job → video output → credits deducted

The revised version is better than the earlier Supabase version because it keeps the database, storage, authentication, and hosting on Replit. Before implementation, four decisions need to be made explicit:

1. Seedance's actual API contract is unknown, so the provider integration must be an adapter with a mock mode rather than guessed request fields.
2. A route that polls jobs is not automatically a background worker. The MVP should use frontend polling plus a protected processing route, with a scheduled worker added only when its runtime is available.
3. Credits, Stripe webhooks, and generation creation need idempotency and transactional boundaries to prevent double charges.
4. The MVP should ship one-time credit packs first. Subscription billing can remain a later phase unless recurring plans are a launch requirement.

## Recommended MVP boundary

### Ship in the first release

- Email/password authentication with Auth.js.
- Google sign-in behind optional configuration.
- Text-to-video generation.
- Image-to-video generation.
- Four style presets:
  - Realistic
  - 3D animated feature
  - Anime
  - Claymation
- Saved characters with a locked visual description.
- Optional character reference image.
- Prompt enhancement preview before generation.
- Credit balance and one-time Stripe credit packs.
- Generation history with status, thumbnail, download, and copy-link actions.
- Mock provider mode so the complete product flow can be tested without a Seedance key.

### Explicitly defer

- Video-to-video restyling.
- Batch generation.
- Timeline editing.
- Team workspaces.
- Public discovery gallery.
- Developer API access.
- Recurring Stripe subscriptions.
- Claims of guaranteed character identity consistency.

The character system should promise **prompt and reference consistency support**, not a guaranteed identical face. Actual consistency depends on Seedance's reference-image and seed capabilities.

## Critical changes to the data model

Keep Prisma as the only database access layer. Add the following fields or constraints before migration:

### User

- `id`
- `email` with a unique index
- `passwordHash` nullable
- `name` nullable
- `credits` defaulting to 20
- `plan` defaulting to `free`
- `createdAt`
- `updatedAt`

### Generation

- `id`
- `userId`
- `prompt`
- `enhancedPrompt` nullable
- `finalPrompt`
- `type`
- `style`
- `aspectRatio`
- `durationSeconds`
- `resolution`
- `creditsUsed`
- `status`
- `seedanceJobId` nullable
- `provider` defaulting to `seedance`
- `outputObjectKey` nullable
- `thumbnailObjectKey` nullable
- `errorCode` nullable
- `errorMessage` nullable
- `idempotencyKey` nullable, unique per user
- `createdAt`
- `completedAt` nullable
- `updatedAt`

Store object keys rather than permanent URLs. Generate short-lived signed URLs when displaying or downloading a video.

### Character

- `id`
- `userId`
- `name`
- `referenceImageObjectKey` nullable
- `sourceDescription` nullable
- `lockedDescription` nullable
- `style`
- `seed` nullable
- `createdAt`
- `updatedAt`

`lockedDescription` must be nullable because a character can begin with an image and the description-generation call may fail or be unavailable.

### CreditTransaction

- `id`
- `userId`
- `amount`
- `type`
- `stripePaymentId` nullable
- `stripeEventId` nullable, unique when present
- `generationId` nullable
- `metadata` JSON nullable
- `createdAt`

Use a transaction record for every deduction, refund, and purchase. Never make the user's balance the only accounting record.

### Share link

The “copy a shareable link” feature needs its own model or an opaque share token on `Generation`:

- `shareToken` nullable, unique
- `shareEnabled` defaulting to false

The public route should expose only completed generations with a valid opaque token. It should never expose a user's dashboard or raw storage credentials.

## Provider integration contract

Do not write Seedance calls directly into route handlers. Define an interface in `lib/video-provider.ts`:

```ts
type CreateVideoInput = {
  prompt: string;
  type: "text_to_video" | "image_to_video";
  imageUrl?: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  durationSeconds: number;
  resolution: string;
  style: string;
  referenceImageUrl?: string;
  seed?: string;
};

type VideoJob = {
  providerJobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  outputUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
};

interface VideoProvider {
  createJob(input: CreateVideoInput): Promise<VideoJob>;
  getJobStatus(providerJobId: string): Promise<VideoJob>;
}
```

Implement:

- `SeedanceProvider`, enabled only when the API base URL and key exist.
- `MockVideoProvider`, enabled by `VIDEO_PROVIDER=mock`.

The Seedance adapter should not be finalized until its documentation or an example request/response is available. Specifically verify:

- Text-to-video endpoint and image-to-video endpoint.
- Authentication format.
- Duration and resolution field names.
- Reference-image conditioning.
- Seed locking.
- Callback support and signature verification.
- Output URL lifetime.
- Rate limits and expected failure responses.

The rest of the app can be built and tested against the mock provider without blocking on those details.

## Generation and credit transaction rules

The `POST /api/generate` route should:

1. Authenticate the session.
2. Validate the request with Zod.
3. Load the selected character by both `id` and `userId`.
4. Calculate the cost on the server.
5. Reject insufficient credits.
6. Create the generation and deduction transaction atomically.
7. Call the provider after the database reservation succeeds.
8. Save the provider job ID and change status to `processing`.
9. Refund the deduction if the provider definitively rejects the job.

The client must never submit `creditsUsed`, `finalPrompt`, `status`, or provider job IDs as authoritative values.

Recommended first cost table:

| Resolution | Cost |
| --- | ---: |
| Standard | 1 credit per second |
| High | 2 credits per second |

Use `Math.max(1, durationSeconds * multiplier)` and validate duration against a small fixed allowlist. Add a request idempotency key so browser retries cannot create two generations or deduct credits twice.

## Job processing

For the first release:

- The frontend polls `/api/generations/:id` every 3–5 seconds.
- The status route reads only the authenticated user's generation.
- A protected `/api/jobs/process` route can process queued or processing jobs in batches.
- The route must require a server-side worker secret and must not be publicly callable without authentication.
- If Seedance supports callbacks, add a signed webhook handler, but keep polling as the fallback.

Do not describe this as a persistent worker until the deployment actually runs one. A route exists only when something invokes it.

Add operational safeguards:

- Maximum provider polling age.
- Retry limit.
- Provider timeout handling.
- Refund on terminal failure.
- Stored `errorCode` and user-safe `errorMessage`.
- Server logs that include generation ID, not prompt contents or secrets.

## Auth and authorization

The code should provide:

- `getCurrentUser()` and `requireUser()` helpers.
- A single Prisma client singleton.
- Per-user filters on every generation, character, transaction, and share-link query.
- Credentials signup with bcrypt.
- Credentials login through Auth.js.
- Google provider only when both Google secrets are present.
- A clear setup error rather than a broken sign-in button when Google is not configured.

Also include rate limits for:

- Signup and login attempts.
- Prompt enhancement.
- Generation creation.
- File uploads.

## File upload and storage rules

For reference images:

- Accept only explicit image MIME types.
- Enforce a small maximum size.
- Check the file signature where practical, not only the browser-provided MIME type.
- Generate a random object key; never use the user-provided filename as the storage path.
- Store the object key in Prisma.
- Keep the bucket private.
- Use signed URLs with short expirations.

For generated video:

- Copy the provider result into Object Storage when the provider URL is temporary.
- Store the object key, not an unverified provider URL.
- Do not proxy arbitrary URLs from the client.
- Add a cleanup strategy for abandoned uploads and failed jobs.

## Prompt composition

Keep prompt construction deterministic and versioned:

```text
[character locked description, if selected]
[user prompt]
[style preset]
[camera and motion guidance]
```

Store the raw prompt, enhanced prompt, final prompt, style, and a `promptVersion`. This makes it possible to improve presets without changing historical generations.

The enhancement endpoint should only preview a candidate prompt. It should not deduct credits or create a generation. The user must be able to accept the enhanced version or use the original.

For the user-facing style label, prefer **3D animated feature** over a trademarked “Pixar” label. The internal preset can preserve the existing `pixar_3d` key temporarily if compatibility matters, but the product should avoid promising output from a named studio.

## Stripe rules

For MVP, use two or more one-time credit packs:

- Pack ID and price are defined server-side.
- The client submits only a pack ID.
- Checkout metadata includes the internal user ID and pack ID.
- The webhook verifies the Stripe signature.
- `checkout.session.completed` is processed idempotently using the Stripe event ID.
- Credits are added only after successful verification.
- The webhook does not trust a client-supplied credit amount.

Subscriptions should be a separate milestone. If they remain in the brief, define plan entitlements, renewal behavior, cancellation, failed payments, and credit rollover before implementation.

## Acceptance criteria

The MVP is complete when all of these work in mock-provider mode:

1. A new user signs up and receives 20 credits.
2. A user signs in and signs out.
3. A user creates a character from text, with an optional reference image.
4. The app saves a locked character description.
5. The user submits a text-to-video generation with a selected style and character.
6. The app shows the calculated cost before submission.
7. Credits are deducted exactly once.
8. The mock job transitions from queued to processing to completed.
9. The completed video appears in history with its style and character.
10. The user can download it and create a share link.
11. Insufficient credits block submission without creating a generation.
12. A failed provider job refunds the deduction exactly once.
13. A second generation can reuse the same saved character.
14. One user's generation, character, transaction, and share token cannot be read by another user.
15. Stripe test-mode purchase adds credits exactly once.

Seedance mode should be considered a separate integration acceptance test after its actual API contract is confirmed.

## Recommended implementation order

### Phase 0 — foundation

- Scaffold the app.
- Add Prisma schema and migrations.
- Add Auth.js credentials flow.
- Add shared validation, authorization, and error handling.
- Add mock provider and environment validation.

### Phase 1 — usable product loop

- Build the generation form.
- Add style presets and deterministic prompt composition.
- Add credit reservation/refund logic.
- Add mock job polling.
- Build dashboard and download flow.

### Phase 2 — character consistency

- Add private image uploads.
- Add character CRUD.
- Add Claude locked-description generation.
- Include the character in prompt composition.

### Phase 3 — payments

- Add Stripe credit packs.
- Add verified, idempotent webhooks.
- Add pricing page and credit purchase history.

### Phase 4 — Seedance

- Confirm the provider contract.
- Implement the Seedance adapter.
- Add reference-image and seed fields only where supported.
- Copy outputs into Object Storage.
- Test retries, timeouts, failures, and refunds.

### Phase 5 — deployment hardening

- Configure Replit Secrets and Object Storage.
- Configure Google OAuth redirect URLs if enabled.
- Run production build.
- Verify webhook routes in Stripe test mode.
- Run the acceptance checklist.

## Final recommendation

Build the complete product against the mock provider first. That gives Vibedeo a testable, demoable app without inventing Seedance's API shape. Then swap in the real provider adapter, measure the quality of the 3D animated output and character reuse, and tune the prompt presets based on actual generations rather than assumptions.