# Future features

Deliberately out of scope for the MVP. Each entry notes where it would hook in,
so the next pass doesn't have to re-derive it.

## Video-to-video restyle
Take an existing clip and re-render it in another style.
- `prisma/schema.prisma`: add `video_to_video` to `GenerationType`, plus a
  `sourceGenerationId` on `Generation`.
- `lib/seedance.ts`: add `createVideoToVideoJob()` beside the other two.
- `components/VideoCard.tsx`: a "Restyle" action on completed clips.

## Batch generation
Queue N variants of one prompt (different seeds or styles) in a single action.
- `app/api/generate/route.ts`: accept `variants: number`, loop `startGeneration`
  inside one credit check so a partial batch can't overdraw.
- The polling hook already handles many in-flight rows.

## Built-in timeline editor
Stitch clips, trim, add audio.
- New `/editor` route plus a `projects` / `project_clips` pair of tables.
- Export would need ffmpeg (a Replit Nix package) or a render service.

## Team workspaces
- `organizations` + `memberships` tables; `Generation.userId` becomes
  `ownerId` + `organizationId`.
- `lib/auth.ts`: extend `requireUserId()` into a `requireMembership(orgId)`
  helper — every route already funnels through that one module, which is the
  point.

## Public gallery
- `Generation.visibility` enum (private/unlisted/public) plus a moderation flag.
- `/api/files/[...key]` already separates owner access from signed access; a
  public tier would be a third branch.

## API access
- `api_keys` table; a bearer-token branch in `requireUserId()`.
- Rate limiting per key (Postgres counter or Redis).

## Other candidates
- Character reference *sets* (multiple angles per character) for stronger
  identity locking, once the Seedance plan supports multi-image conditioning.
- Thumbnail generation when Seedance doesn't return one (ffmpeg first frame).
- Webhook-driven completion everywhere, retiring polling entirely.
