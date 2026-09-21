# Vibedeo

Vibedeo is an AI video creation studio for producing short cinematic clips from prompts and reusable characters.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/vibedeo run dev` — run the Vibedeo web app through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API contract: `lib/api-spec/openapi.yaml`
- Vibedeo frontend: `artifacts/vibedeo/src`
- Vibedeo API routes: `artifacts/api-server/src/routes/vibedeo.ts`
- Prompt and mock-provider domain logic: `artifacts/api-server/src/lib/vibedeo.ts`
- Database schema: `lib/db/src/schema/vibedeo.ts`
- Theme tokens: `artifacts/vibedeo/src/index.css`

## Architecture decisions

- Build and validate the complete product loop against a mock video provider before implementing Seedance. **Why:** the Seedance request/response contract, seed locking, reference conditioning, and callback behavior have not been provided.
- Keep video-provider behavior behind server-side domain logic so real Seedance calls can replace the mock without changing the frontend API.
- The current first build runs as a persistent demo workspace user; account isolation and production authentication are a separate integration milestone.
- Credit costs are calculated and deducted on the server inside a database transaction.

## Product

- Dashboard with credit, generation, processing, and saved-character summaries
- Text-to-video creation flow with style, aspect ratio, duration, resolution, character casting, and prompt enhancement
- Reusable character library with generated locked descriptions
- Searchable generation library with mock progress, video playback/download, and share links
- Credit pack presentation ready for payment integration

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Re-run API codegen after every change to `lib/api-spec/openapi.yaml`.
- Do not guess Seedance fields. Obtain current documentation or an example request/response before replacing the mock provider.
- The frontend artifact is mounted at `/`; API requests use the shared `/api` route.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
